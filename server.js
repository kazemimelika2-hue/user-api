const express = require('express');
const app = express();

const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const userService = require("./user-service.js");

const passport = require("passport");
const passportJWT = require("passport-jwt");
const jwt = require("jsonwebtoken");


app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(cors());
app.use(express.json());


let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
jwtOptions.secretOrKey = process.env.JWT_SECRET;

let strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
  userService.getUserById(jwt_payload._id)
    .then(user => next(null, user))
    .catch(err => next(null, false));
});

passport.use(strategy);
app.use(passport.initialize());



app.post("/api/user/register", (req, res) => {
  userService.registerUser(req.body)
    .then(msg => res.json({ message: msg }))
    .catch(msg => res.status(422).json({ message: msg }));
});

app.post("/api/user/login", (req, res) => {
  userService.checkUser(req.body)
    .then(user => {
      let payload = {
        _id: user._id,
        userName: user.userName
      };
      let token = jwt.sign(payload, process.env.JWT_SECRET);
      res.json({ message: "login successful", token: token });
    })
    .catch(msg => res.status(422).json({ message: msg }));
});

app.get("/api/user/favourites",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService.getFavourites(req.user._id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  });

app.put("/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService.addFavourite(req.user._id, req.params.id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  });

app.delete("/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService.removeFavourite(req.user._id, req.params.id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  });



const HTTP_PORT = process.env.PORT || 8080;

userService.connect()
  .then(() => {
    app.listen(HTTP_PORT, () => console.log("API running on port " + HTTP_PORT));
  })
  .catch(err => {
    console.log("unable to start server: " + err);
    process.exit();
  });
