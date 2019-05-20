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
  res.render('home', context);
});

app.get('/products', (req,res,next) => {
  let context = {};

  if (req.query.search) {
    // If search query exists: select products from db
    // filtered by search query
    pool.query('SELECT * FROM products WHERE products.name LIKE ?',[`%${req.query.search}%`], (err, rows, fields) => {
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
  // todo: update product in db

  // let product = sampleData.products[req.params.productId];

  // product.price = req.body.price || product.price,
  // product.name = req.body.name || product.name,
  // product.description = req.body.description || product.description,
  // product.brandName = req.body.brandName || product.brandName,
  // product.modelName = req.body.modelName || product.modelname,
  // product.inStock = req.body.inStock || product.inStock,

  res.redirect('/products/' + req.params.productId);
});

app.get('/products/:productId/delete', (req,res,next) => {
  // todo: delete product from db

  // sampleData.products.splice(req.params.productId, 1);
  // let length = sampleData.products.length;
  // for (let i=0; i < length; i++) {
  //   sampleData.products[i].id= i;
  // }
  
  res.redirect('/products');
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
  pool.query("SELECT id FROM lineItems WHERE lineItems.pid = ? AND lineItems.cid = ? AND lineItems.oid IS NULL", [productId, currentCustomerId], (err, rows, fields) => {
    if(err){
        next(err);
        return;
    }
    if (rows.length) {
      createItem = false;
      // todo: update qty of exiting lineitem
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
    pool.query("UPDATE lineItems SET oid = ? WHERE cid = ?", [orderId, currentCustomerId], (err, result) => {
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

  sampleData.orders[orderId].status = 'complete';

  res.redirect(`/orders/${orderId}`);
});


app.get('/signin', (req,res,next) => {
  
  if (req.query.email) {
    let email = req.query.email;
    let length = sampleData.customers.length;
    let customerId;

    // todo: check db for account
    for (let i=0; i < length; i++) {
      if (sampleData.customers[i].email === email) {
        customerId = sampleData.customers[i].id;
      }
    }

    if (sampleData.customers[customerId]) {

      currentCustomerId = customerId;

      res.redirect(`/account/${customerId}`);

    } else {
      // todo: if account doesn't exist redirect to create new account
      res.redirect('/account/new');
    }  
  } else {
    res.render('pages/signin');
  }

});

app.get('/account/new', (req,res,next) => {
  res.render('pages/account-new');
});

app.post('/account/new', (req,res,next) => {
  let customer = {
    id: sampleData.customers.length,
    email: req.body.email,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    street1: req.body.street1,
    street2: req.body.street2,
    city: req.body.city,
    state: req.body.state,
    zip: req.body.zip,
    birthdate: req.body.birthdate,
  }

  sampleData.customers.push(customer);

  res.redirect(`/account/${customer.id}`);
})

app.get('/account/:customerId', (req,res,next) => {
  let params = req.params;
  let customerId = params.customerId;
  let context = {};
  // todo: get customer info from id param

  // use sample data until connected to db
  context.customer = sampleData.customers[customerId];

  // set current customer:
  currentCustomerId = Number(customerId);

  res.render('pages/account', context);
});

app.post('/account/:customerId/update', (req,res,next) => {
  // todo: update customer in db

  let customer = sampleData.customers[req.params.customerId];

  customer.email = req.body.email || customer.email,
  customer.firstName = req.body.firstName || customer.firstName,
  customer.lastName = req.body.lastName || customer.lastName,
  customer.street1 = req.body.street1 || customer.street1,
  customer.street2 = req.body.street2 || customer.street2,
  customer.city = req.body.city || customer.city,
  customer.state = req.body.state || customer.state,
  customer.zip = req.body.zip || customer.zip,
  customer.birthdate = req.body.birthdate || customer.birthdate,

  res.redirect('/account/' + req.params.customerId);
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
