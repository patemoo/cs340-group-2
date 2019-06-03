var bodyParser = require('body-parser');
var express = require('express');
const mysql = require('mysql');

const pool = mysql.createPool({
  host  : 'classmysql.engr.oregonstate.edu',
  user  : 'cs340_moorepat',
  password: '7567',
  database: 'cs340_moorepat'
});

var STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','UT','VT','VA','WA','WV','WI','WY'];
var date = new Date();
var currentCustomerId = null; 

// todo: remove this ones login is hooked up to db
currentCustomerId = 6;

var sampleData = {
  products: [
    {
      id: 0,
      sku: '#####',
      price: '000.00',
      name: 'Product One',
      description: 'description text goes here.',
      brandName: 'brand',
      modelName: 'model',
      inStock: 30,
    },
    {
      id: 1,
      sku: '#####',
      price: '000.00',
      name: 'Product Two',
      description: 'description text goes here.',
      brandName: 'brand',
      modelName: 'model',
      inStock: 20,
    },
    {
      id: 2,
      sku: '#####',
      price: '000.00',
      name: 'Product Three',
      description: 'description text goes here.',
      brandName: 'brand',
      modelName: 'model',
      inStock: 10,
    }
  ],
  customers: [
    {
      id: 0,
      email: 'john@doe.com',
      firstName: 'John',
      lastName: 'Doe',
      street1: '',
      street2: '',
      city: 'Seattle',
      state: 'WA',
      zip: '98102',
      birthdate: date,
    }
  ],
  reviews: [],
  lineitems: [],
  orders: [],
}

var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', process.argv[2]);
app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req,res,next) => {
  let context = {};
  // res.render('home', context);
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
    pool.query('SELECT * FROM reviews WHERE reviews.pid = ?', [params.productId], (err, reviews, fields) => {
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

  // Add new review to db
  // todo: add correct customer id.
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

app.get('/products/:productId/delete', (req,res,next) => {
    let productId = Number(req.params.productId);
    pool.query("DELETE FROM products WHERE id = ?", [productId], (err, result) => {
        if (err) {
            next(err);
            return;
        }
    })
    
    pool.query("DELETE FROM lineItems WHERE oid IS NULL AND pid = ?", [productId], (err, result) => {
        if (err) {
            next(err);
            return;
        }
        res.redirect('/products');
    })
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
      console.log(rows);
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
  let context = {};

  pool.query("SELECT oid FROM lineItems li WHERE li.cid = ? AND li.oid IS NOT NULL GROUP BY li.oid ", [currentCustomerId], (err, rows, fields) => {
    if(err){
      next(err);
      return;
    }
    console.log(rows);
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
    pool.query("SELECT * FROM orders WHERE orders.id = ?", [orderId], (err, rows, fields) => {
      if(err){
        next(err);
        return;
      }
      context.order = rows[0];

      res.render('pages/order', context);
    });
    
  });

});

app.get('/orders/:orderId/complete', (req,res,next) => {
  let orderId = Number(req.params.orderId);

  // todo: complete order

  res.redirect(`/orders/${orderId}`);
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
      customerId = rows[0].id;

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
