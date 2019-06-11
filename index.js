var bodyParser = require('body-parser');
var express = require('express');
const mysql = require('mysql');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
    host  : 'classmysql.engr.oregonstate.edu',
    user  : process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'cs340_moorepat'
});

var STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','UT','VT','VA','WA','WV','WI','WY'];
var currentCustomerId = null; 

var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', process.argv[2]);
app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req,res,next) => {
    res.redirect('/products');
});

app.get('/products', (req,res,next) => {
  let context = {};
  if (req.query.search) {
        // If search query exists: select products from db
        // filtered by search query
        pool.query('SELECT * FROM products WHERE products.name LIKE ? or products.sku like ?', [`%${req.query.search}%`, `%${req.query.search}%`], (err, rows, fields) => {
            if(err){
                next(err);
                return;
            }
            context.products = rows;
            res.render('pages/products', context);
        });
    } else {

        // Select all products from db
        pool.query('SELECT * FROM products', (err, rows, fields) => {
            if(err){
                next(err);
                return;
            }
            context.products = rows;
            res.render('pages/products', context);
        });
    }
});

app.get('/products/new', (req,res,next) => {
    res.render('pages/product-new');
});

app.post('/products/new', (req,res,next) => { 
    // Add new product to products table
    pool.query("INSERT INTO products (`sku`, `name`, `price`, `description`, `brandName`, `modelName`, `inStock`) VALUES (?, ? , ? , ?, ?, ? , ?)", 
    [req.body.sku, req.body.name, req.body.price, req.body.description, req.body.brandName, req.body.modelName, req.body.inStock], (err, result) => {
        if(err){
            next(err);
            return;
        }
        res.redirect('/products');
    });
});

app.get('/products/:productId', (req,res,next) => {
    let params = req.params;
    let context = {};

    // Query db to get product info from id param
    pool.query('SELECT * FROM products WHERE products.id = ?',[params.productId], (err, rows, fields) => {
        if(err){
            next(err);
            return;
        }
        context.product = rows[0];
        context.customer = {
        id: currentCustomerId,
        }

        // Query db to get reviews for the product
        pool.query('SELECT * FROM reviews r INNER JOIN customers c ON c.id = r.cid WHERE r.pid = ?', [params.productId], (err, reviews, fields) => {
        if(err){
            next(err);
            return;
        }
        context.reviews = reviews;
        res.render('pages/product', context);
        });
    });  
});

app.post('/products/:productId/reviews', (req,res,next) => {
    // if customer not set, redirect to sign-in
    if (currentCustomerId == null) {
        res.redirect('/signin');
        return;
    }

    // Add new review to db
    pool.query("INSERT INTO reviews (`pid`, `cid`, `rating`, `title`, `body`) VALUES (?, ? , ? , ?, ?)", 
        [req.params.productId, currentCustomerId, req.body.rating, req.body.title, req.body.comment], (err, result) => {
            if(err){
                next(err);
                return;
            }
            res.redirect('/products/' + req.params.productId);
    });
});

app.post('/products/:productId/update', (req,res,next) => {
    // Update product in db
    pool.query("UPDATE products SET sku = ?, name = ?, price = ?, description = ?, brandName = ?, modelName = ?, inStock = ? WHERE id = ?", 
        [req.body.sku, req.body.name, req.body.price, req.body.description, req.body.brandName, req.body.modelName, req.body.inStock, req.params.productId], (err, result) => {
            if(err){
                next(err);
                return;
            }
            res.redirect('/products/' + req.params.productId);
    });  
});

//Deletes items from the DB
app.get('/products/:productId/delete', (req, res, next) => {
    let productId = Number(req.params.productId);
    let isEmpty;

    //Checks to see if the item is used in completed orders
    pool.query("SELECT products.id FROM products INNER JOIN lineItems ON products.id=lineItems.pid WHERE products.id = ? and lineItems.oid IS NOT NULL", [productId], (err, rows) => {
        if (err) {
            next(err);
            return;
        }
        hasOrders = rows[0];
        //If it is used in pending/completed orders, item will not be removed.
        if (hasOrders) {
            console.log("Cannot delete. Item is already in an order and cannot be deleted");
            res.redirect('/products/');
        }
        //Else remove the item from products and lineItems.
        else {
            pool.query("DELETE FROM products WHERE id = ?", [productId], (err, result) => {
                if (err) {
                    next(err);
                    return;
                }
                pool.query("DELETE FROM lineItems WHERE oid IS NULL AND pid = ?", [productId], (err, result) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    res.redirect('/products');
                    console.log("Item deleted succesfully.");
                });
            });
        };
    });
});

app.get('/cart', (req,res,next) => {
    // if customer not set, redirect to sign-in
    if (currentCustomerId == null) {
        res.redirect('/signin');
        return;
    }

    let context = {};
    
    // Make db call to get cart line items
    // should return all line items for customer that do not have a order id
    pool.query("SELECT * FROM lineItems li INNER JOIN products p ON p.id = li.pid WHERE li.cid = ? AND li.oid IS NULL", [currentCustomerId], (err, rows, fields) => {
        if(err){
            next(err);
            return;
        }
        context.cartItems = rows;
        res.render('pages/cart', context);
    });
});

app.get('/cart/:productId/delete', (req, res, next) => {
    let productId = Number(req.params.productId);

    pool.query("DELETE FROM lineItems WHERE pid = ? and cid = ? and oid is null", [productId, currentCustomerId], (err, result) => {
        if (err) {
            next(err);
            return;
        }
        res.redirect('/cart');
    });
});

app.post('/cart/:productId/save', (req, res, next) => {
    let productId = Number(req.params.productId);
    let qty = Number(req.body.newQty);

    pool.query("UPDATE lineItems SET qty = ? WHERE pid = ? AND cid = ? AND oid IS NULL", [qty, productId, currentCustomerId], (err, result) => {
        if(err){
          next(err);
          return;
        }
        res.redirect('/cart');
    });
});

app.get('/cart/:productId', (req,res,next) => {
    // if customer not set, redirect to sign-in
    if (currentCustomerId == null) {
        res.redirect('/signin');
        return;
    }

    let productId = Number(req.params.productId);
    let createItem = true;

    // if lineitem already exists increase qty
    pool.query("SELECT id, qty FROM lineItems WHERE lineItems.pid = ? AND lineItems.cid = ? AND lineItems.oid IS NULL", [productId, currentCustomerId], (err, rows, fields) => {
        if(err){
            next(err);
            return;
        }
        if (rows.length) {
        createItem = false;
        // todo: update qty of exiting lineitem

        let qty = 1 + rows[0].qty;

        pool.query("UPDATE lineItems SET qty = ? WHERE pid = ? AND cid = ? AND oid IS NULL", [qty, productId, currentCustomerId], (err, result) => {
            if(err){
                next(err);
                return;
            }
            res.redirect('/cart');
        });
        }

        // create lineitem in db with product id and account id
        if (createItem) {

        pool.query("INSERT INTO lineItems (`pid`, `cid`, `qty`) VALUES (?, ?, ?)", [productId, currentCustomerId, 1], (err, result) => {
            if(err){
                next(err);
                return;
            }
            res.redirect('/cart');
        });
        }

    });
});

app.get('/checkout', (req,res,next) => {
    // todo: get account id from storage
    // todo: create order & orderId
    pool.query("INSERT INTO orders (`status`) VALUES (?)", ['pending'], (err, result) => {
        if(err){
            next(err);
            return;
        }
        let orderId = result.insertId;

        // Update cart items with orderId
        pool.query("UPDATE lineItems SET oid = ? WHERE cid = ? AND oid IS NULL", [orderId, currentCustomerId], (err, result) => {
            if(err){
                next(err);
                return;
            }
            res.redirect(`/orders/${orderId}`);
        });
        
    });
});

app.get('/orders', (req,res,next) => {
    // if customer not set, redirect to sign-in
    if (currentCustomerId == null) {
        res.redirect('/signin');
        return;
    }

    let context = {};

    pool.query("SELECT oid FROM lineItems li WHERE li.cid = ? AND li.oid IS NOT NULL GROUP BY li.oid ", [currentCustomerId], (err, rows, fields) => {
        if(err){
            next(err);
            return;
        }
        context.orders = rows;

        res.render('pages/orders', context);
    });
})

app.get('/orders/:orderId', (req,res,next) => {
    let context = {};
    let orderId = req.params.orderId

    pool.query("SELECT * FROM lineItems li INNER JOIN products p ON p.id = li.pid WHERE li.cid = ? AND li.oid = ?",[currentCustomerId, orderId], (err, items, fields) => {
        if(err){
            next(err);
            return;
        }
        context.orderItems = items;

        let length = items.length;
        let total = 0;
        for (let i=0;i<length;i++) {
            total += (items[i].qty * items[i].price);
        }

        context.total = total;

        pool.query("SELECT * FROM orders WHERE orders.id = ?", [orderId], (err, rows, fields) => {
            if(err){
                next(err);
                return;
            }
            context.order = rows[0];
            context.showPlaceOreder = context.order.status == "pending"

            res.render('pages/order', context);
        });
            
    });
});

app.get('/orders/:orderId/complete', (req,res,next) => {
    let orderId = Number(req.params.orderId);

    // todo: complete order
    pool.query("UPDATE orders SET status = ? WHERE id = ?", ['shipped', orderId], (err, result) => {
        if(err){
            next(err);
            return;
        }
        res.redirect(`/orders/${orderId}`);
    });
});

app.get('/orders/:orderId/cancel', (req,res,next) => {
    let orderId = Number(req.params.orderId);

    // todo: complete order
    pool.query("UPDATE orders SET status = ? WHERE id = ?", ['canceled', orderId], (err, result) => {
        if(err){
            next(err);
            return;
        }
        res.redirect(`/orders/${orderId}`);
    });
});


app.get('/signin', (req,res,next) => {
    if (req.query.email) {
        let email = req.query.email;
        let customerId;

        pool.query("SELECT id FROM customers WHERE customers.email = ?", [email], (err, rows) => {
        if(err){
            next(err);
            return;
        }
        customerId = rows.length && rows[0].id;

        if (customerId) {
            currentCustomerId = customerId;
            res.redirect(`/account/${customerId}`);
        } else {
            res.redirect('/account/new');
        }

        });

    } else {
        res.render('pages/signin');
    }
});

app.get('/account/new', (req,res,next) => {
    let context = {};
    context.states = STATES;
    res.render('pages/account-new', context);
});

app.post('/account/new', (req,res,next) => {

    pool.query("INSERT INTO customers (`email`, `firstName`, `lastName`, `street1`, `street2`, `city`, `state`, `zip`, `birthdate` ) VALUES (?, ? , ? , ?, ?, ?, ?, ?, ?)", 
        [req.body.email, req.body.firstName, req.body.lastName, req.body.street1, req.body.street2, req.body.city, req.body.state, req.body.zip, req.body.birthdate], (err, result) => {
        if(err){
            next(err);
            return;
        }

        let customerId = result.insertId;

        res.redirect(`/account/${customerId}`);
    });
})

app.get('/account/:customerId', (req,res,next) => {
    let params = req.params;
    let customerId = params.customerId;
    let context = {};
    context.states = STATES;

    // Get customer info from id param
    pool.query("SELECT * FROM customers WHERE customers.id = ?", [customerId], (err, rows) => {
        if(err){
            next(err);
            return;
        }
        context.customer = rows[0];
        currentCustomerId = Number(customerId);
        res.render('pages/account', context);
    });
});

app.post('/account/:customerId/update', (req,res,next) => {
    // Update customer in db
    pool.query("UPDATE customers SET email = ?, firstName = ?, lastName = ?, street1 = ?, street2 = ?, city = ?, state = ?, zip = ?, birthdate = ? WHERE customers.id = ?", 
        [req.body.email, req.body.firstName, req.body.lastName, req.body.street1, req.body.street2, req.body.city, req.body.state, req.body.zip, req.body.birthdate, req.params.customerId], (err, result) => {
            if(err){
                next(err);
                return;
            }
            res.redirect('/account/' + req.params.customerId);
    }); 
});

app.use(function(req,res){
    res.status(404);
    res.render('404');
});

app.use(function(err, req, res, next){
    console.error(err.stack);
    res.status(500);
    res.render('500');
});

app.listen(app.get('port'), function(){
    console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});