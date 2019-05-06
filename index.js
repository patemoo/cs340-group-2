var bodyParser = require('body-parser');
var express = require('express');
// var mysql = require('./dbcon.js');

var sampleData = {
  products: [
    {
      id: 0,
      sku: '#####',
      price: '000.00',
      name: 'Product One',
      description: 'description text goes here.',
      brand: 'brand',
      model: 'model',
      stock: 30,
    },
    {
      id: 1,
      sku: '#####',
      price: '000.00',
      name: 'Product Two',
      description: 'description text goes here.',
      brand: 'brand',
      model: 'model',
      stock: 20,
    },
    {
      id: 2,
      sku: '#####',
      price: '000.00',
      name: 'Product Three',
      description: 'description text goes here.',
      brand: 'brand',
      model: 'model',
      stock: 10,
    }
  ],
  nextIndex: 3,
}

var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', process.argv[2]);
app.use(express.static('public'));

app.use(bodyParser.json({ type: 'application/*+json' }))

app.get('/', (req,res,next) => {
  let context = {};
  res.render('home', context);
});

app.get('/products', (req,res,next) => {
  // todo: select all products from db
  let context = {
    products: sampleData.products,
  }
  res.render('pages/products', context);
});

app.get('/products/new', (req,res,next) => {
  res.render('pages/product-new');
});

app.post('/products/new', (req,res,next) => {
  let product = {
    id: sampleData.count,
    price: req.body.price,
    name: req.body.name,
    description: req.body.description,
    brand: req.body.brand,
    model: req.body.model,
    stock: req.body.stock,
  }
  // use sample data until connected to db
  sampleData.products.push(product);
  sampleData.nextIndex += 1;

  // todo: add new product to products table in db

  res.redirect('/products');
});

app.get('/products/:productId', (req,res,next) => {
  let params = req.params;
  let context = {};
  // todo: get product info from id param

  // use sample data until connected to db
  context.product = sampleData.products[params.productId];
  
  res.render('pages/product', context);
});

app.post('/products/:productId/reviews', (req,res,next) => {
  // todo: add review to db

  res.redirect('/products/' + req.params.productId);
});

app.post('/products/:productId/update', (req,res,next) => {
  // todo: update product in db
  res.redirect('/products/' + req.params.productId);
});

app.get('/products/:productId/delete', (req,res,next) => {
  // todo: delete product from db
  sampleData.products.splice(req.params.productId, 1);
  res.redirect('/products');
});

app.get('/cart', (req,res,next) => {
  let context = {};
  // todo: make db call to get cart line items
  // should return all line items for customer that do not have a order id
  let lineitems = []
  context.lineitems = lineitems;

  res.render('pages/cart', context);
});

app.get('/cart/:productId', (req,res,next) => {
  // todo: create lineitem in db with product id and account id
  res.redirect('/cart');
});

app.get('/checkout', (req,res,next) => {
  // todo: create order & orderId
  // todo: get account id from storage
  // todo: update cart items with orderId
  // todo: select all order line items
  let lineitems = [];
  let context = {
    lineitems: lineitems,
    orderId: '123',
  }

  res.render('pages/order', context);
})


app.get('/signin', (req,res,next) => {
  let context = {};
  let accountId = req.query && req.query.account_id;

  if (accountId) {
    // todo: check db for account
    let account = {
      id: accountId,
      fname: 'John',
      lname: 'Doe',
    }
    context.account = account;
    res.render('pages/account', context);

    // todo: if account doesn't exist redirect to create new account
    res.redirect('/account/new');
    
  } else {
    res.render('pages/signin');
  }  
});

app.get('/account', (req,res,next) => {
  res.render('pages/account');
});

app.get('/account/new', (req,res,next) => {
  res.render('pages/account-new');
});

app.post('/account/new', (req,res,next) => {
  res.redirect('/account');
})

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
