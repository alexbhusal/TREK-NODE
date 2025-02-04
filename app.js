const express = require('express');
const expressHBS = require('express-handlebars');
const session= require('express-session')
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const app = express();
app.use(morgan('dev'));
const { body, validationResult } = require('express-validator');
const validator = require('validator');
const port= 9999;
app.use(session({
  secret: 'ayush',
  resave: false,
  saveUninitialized: false,
}));
const isUser = (req, res, next) => {
  if (req.session.user_id) {
      next();
  } else {
      res.redirect('/login');
  }
};
const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
      next();
  } else {
      res.redirect('/admin');
  }
};

const hbs = expressHBS.create({
    extname:'hbs',
    defaultLayout:'main.hbs',
    layoutsDir:"views/layouts/",
    partialsDir:"views/partials/"
  });

app.engine('hbs',hbs.engine);
app.set('view engine','hbs');
app.use("/static",express.static(__dirname+ "/public"));
app.use("/statics",express.static(__dirname+ "/public/Images"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//To connect database
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',  
    password: '',  
    database: 'track'
  });
  connection.connect((error) => {
    if (!error) {
      console.log('Connected to database');
      return;
    }else{
      console.error('Error connecting to database: ', error);
    }  
  });
  //get route
  app.get('/',(req,res)=>{
    res.render('homepage/home')
  });
  app.get('/admin',(req,res)=>{
    res.render('admin/adminlogin')
  })
  app.get('/edit/:user_id',(req, res) => {
    const userId = req.params.user_id;
    const query = 'SELECT * FROM users WHERE user_id = ?';
    connection.query(query, [userId], (err, result) => {
      if (err) throw err;
      const user = result[0];
      res.render('users/updateuser',{user});
    });
  });
  app.get('/editbooking/:id',(req, res) => {
    const id = req.params.id;
    const query = 'SELECT* FROM bookings WHERE id = ?';
    connection.query(query, [id], (err, result) => {
      if (err) throw err;
      const booking = result[0];
      res.render('booking/editbooking',{booking});
    });
  });
  app.get('/admin-editbooking/:id',(req, res) => {
    const id = req.params.id;
    const query = 'SELECT* FROM bookings WHERE id = ?';
    connection.query(query, [id], (err, result) => {
      if (err) throw err;
      const booking = result[0];
      res.render('booking/editbooking',{booking});
    });
  });
  app.get('/delete/:user_id',(req, res) => {
    const user_id = req.params.user_id;
    connection.query('DELETE FROM users WHERE user_id = ?', [user_id], (err) => {
      if (err) throw err;
      res.redirect('/users');
    });
  });
  app.get('/deletebooking/:id',(req, res) => {
    const id = req.params.id;
    connection.query('DELETE FROM bookings WHERE id = ?', [id], (err) => {
      if (err) throw err;
      res.redirect('/mybooking');
    });
  });
  app.get('/admin-deletebooking/:id',(req, res) => {
    const id = req.params.id;
    connection.query('DELETE FROM bookings WHERE id = ?', [id], (err) => {
      if (err) throw err;
      res.redirect('/booking');
    });
  });
  app.get('/users',isAdmin,(req, res) => {
    const sql = 'SELECT * FROM users';
    connection.query(sql, (err, results) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).send('Error fetching users');
      }
      res.render('admin/manageusers', { users: results });
    });
  });
  app.get('/login',(req,res)=>{
    res.render('users/login')
  });
  app.get('/signup',(req,res)=>{
    res.render('users/signup')
  });
  app.get('/pricing',isUser,(req,res)=>{
    res.render('Pricing/pricing')
  })
  app.get('/booknow',isUser,(req,res)=>{
    res.render('users/booknow')
  })
  app.get('/mybooking', isUser,(req, res) => {
    const user_id = req.session.user_id;
    const sql = 'SELECT * FROM bookings WHERE user_id=?';
    connection.query(sql, [user_id], (err, results) => {
      if (err) {
        console.error('Error fetching bookings:', err);
        return res.status(500).send('Error fetching bookings');
      }
      res.render('users/mybooking', { bookings: results });
    });
  });
  app.get('/adminlogout', (req, res) => {
    req.session.destroy((err) => {
    if (err) throw err;
    res.redirect('/admin');
  });
  });
  app.get('/userlogout',isUser, (req, res) => {
  req.session.destroy((err) => {
  if (err) throw err;
  res.redirect('/login');
});
  });
  app.get('/booking',isAdmin,(req, res) => {
    const sql = 'SELECT * FROM bookings';
    connection.query(sql, (err, results) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).send('Error fetching users');
      }
      res.render('admin/managebooking', { booking: results });
    });
  });
  app.get('*',(req,res)=>{
    res.render('errorpage/error404')
  });
    //post route
    app.post('/admin',(req,res)=>{
      const{username,password}= req.body;
      if(username==='admin' && password==='admin'){
        req.session.username = username;
        req.session.isAdmin = true;
        res.render('admin/admin-dashboard');
      }
      else{
        res.send('incorrect username & password');
      }

    });
    app.post('/edit/:user_id',  (req, res) => {
      const userId = req.params.user_id;
      const { username, email } = req.body;
      const query = 'UPDATE users SET username = ?,  email = ? WHERE user_id = ?';
      connection.query(query, [username,  email, userId], (error, result) => {
        if (!error){
          console.log(`User with ID ${userId} updated`);
          res.redirect('/users');
        }
        else{
          console.log("error");
        }
      });
    });
    app.post('/signup', [
      body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
      body('email').trim().isEmail().withMessage('Invalid email').normalizeEmail(),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    ], async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('users/signup', { errors: errors.array() });
      }
    
      const { username, email, password } = req.body;
      const emailCheckQuery = 'SELECT * FROM users WHERE email = ?';
      connection.query(emailCheckQuery, [email], async (err, results) => {
        if (err) {
          console.error('Error checking email:', err);
          return res.status(500).send('Error signing up');
        }
        if (results.length > 0) {
          return res.render('signup', { error: 'Email already exists' });
        }
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          const insertUserQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
          connection.query(insertUserQuery, [username, email, hashedPassword], (err, results) => {
            if (err) {
              console.error('Error inserting user:', err);
              return res.status(500).send('Error signing up');
            }
            console.log('User signed up successfully');
            res.redirect('/login');
          });
        } catch (error) {
          console.error('Error hashing password:', error);
          return res.status(500).send('Error signing up');
        }
      });
    });
    app.post('/login', async (req, res) => {
      const { email, password } = req.body;
      // SQL query to find user by email
      const sql = 'SELECT * FROM users WHERE email = ?';
      connection.query(sql, [email], async (err, results) => {
        if (err) {
          console.error('Error finding user:', err);
          return res.status(500).send('Error logging in');
        }
        if (results.length === 0) {
          return res.status(404).send(`User not found <a href="/signup">signup</a>`);

        }
        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return res.status(401).send('Incorrect username and password');
        }
        req.session.user_id = user.user_id;
        req.session.isAdmin = false;
        res.render('users/userDashboard')
      });
    });
    app.post('/booknow', isUser,(req, res) => {
      const { name, place, date, payment, phone } = req.body;
      const userId = req.session.user_id; // Assuming you have session management set up
    
      // Check if the user has already booked the same place
      const checkBookingSql = `SELECT * FROM bookings WHERE user_id = ? AND place = ?`;
      connection.query(checkBookingSql, [userId, place], (checkErr, checkResult) => {
        if (checkErr) {
          console.log(checkErr);
          res.send('Error checking booking');
        } else {
          if (checkResult.length > 0) {
            // User has already booked this place
            res.send('You have already booked this place.');
          } else {
            // Insert into bookings table
            const insertSql = `INSERT INTO bookings (user_id, name, place, date, payment, phone,tdate) VALUES (?, ?, ?, ?, ?, ?,CURDATE())`;
            connection.query(insertSql, [userId, name, place, date, payment, phone], (insertErr, insertResult) => {
              if (insertErr) {
                console.log(insertErr);
                res.send('Error in booking');
              } else {
                console.log('Booking successful');
                res.redirect('/mybooking');
              }
            });
          }
        }
      });
    });
    app.post('/admin-editbooking/:id', (req, res) => {
      const id = req.params.id;
      const { place, date, phone } = req.body;
      const query = `UPDATE bookings SET place = ?, date = ?, phone = ? WHERE id = ?`;
      connection.query(query, [place, date, phone, id], (err, results) => {
        if (err) {
          console.error('Error updating booking data: ' + err);
          return res.status(500).send('Server Error');
        }
        res.redirect(`/booking`);
      });
    });
    app.post('/editbooking/:id', (req, res) => {
      const id = req.params.id;
      const { place, date, phone } = req.body;
      const query = `UPDATE bookings SET place = ?, date = ?, phone = ? WHERE id = ?`;
      connection.query(query, [place, date, phone, id], (err, results) => {
        if (err) {
          console.error('Error updating booking data: ' + err);
          return res.status(500).send('Server Error');
        }
        res.redirect(`/mybooking`);
      });
    });
    app.get('/success', (req, res) => {
      res.render('success');
    });

app.listen(port,()=>{
    console.log(`http://localhost:${port}`);
});