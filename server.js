// Asign Libs 
const express = require('express');
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const userService = require("./user-service.js");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const jwt = require("jsonwebtoken");

// CORS MUST BE FIRST - before any other middleware!
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;
let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("JWT");
jwtOptions.secretOrKey = process.env.JWT_SECRET;

let strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
    userService.getUserById(jwt_payload._id)
        .then(user => {
            next(null, user);
        })
        .catch(err => {
            next(null, false);
        });
});

passport.use(strategy);
app.use(passport.initialize());

const HTTP_PORT = process.env.PORT || 8080;

app.post("/api/user/register", async (req, res) => {
    try {
        console.log("Register body:", req.body);
        const msg = await userService.registerUser(req.body);
        console.log("Success:", msg);
        res.json({ "message": msg });
    } catch (err) {
        console.log("Error:", err);
        res.status(422).json({ "message": err && err.message ? err.message : String(err) });
    }
});

app.post("/api/user/login", async (req, res) => {
    try {
        console.log("Login body:", req.body);
        const user = await userService.checkUser(req.body);
        let payload = {
            _id: user._id,
            userName: user.userName
        };
        let token = jwt.sign(payload, process.env.JWT_SECRET);
        res.json({ "message": "login successful", token: token });
    } catch (err) {
        console.log("Login error:", err);
        res.status(422).json({ "message": err && err.message ? err.message : String(err) });
    }
});

app.get("/api/user/favourites",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
        userService.getFavourites(req.user._id)
            .then(data => {
                res.json(data);
            }).catch(msg => {
                res.status(422).json({ error: msg.toString() });
            })
    });

app.put("/api/user/favourites/:id",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
        userService.addFavourite(req.user._id, req.params.id)
            .then(data => {
                res.json(data)
            }).catch(msg => {
                res.status(422).json({ error: msg.toString() });
            })
    });

app.delete("/api/user/favourites/:id",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
        userService.removeFavourite(req.user._id, req.params.id)
            .then(data => {
                res.json(data)
            }).catch(msg => {
                res.status(422).json({ error: msg.toString() });
            })
    });

userService.connect()
    .then(() => {
        console.log("Database connected successfully");
        // Only start server if not in Vercel serverless environment
        if (require.main === module) {
            app.listen(HTTP_PORT, () => { 
                console.log("API listening on: " + HTTP_PORT); 
            });
        }
    })
    .catch((err) => {
        console.log("unable to connect to database: " + err);
        process.exit();
    });

// Export the Express app for Vercel serverless functions
module.exports = app;