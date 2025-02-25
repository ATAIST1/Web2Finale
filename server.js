require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const qr = require('qr-image');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const axios = require('axios')

const app = express();
const PORT = 3000;

// Middleware
app.use(session({
    secret: '123', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));

// OpenWeatherAPI configuration
const OPENWEATHER_API_KEY = 'afe3029ed49903aa0b41559b63731738';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// ipstack API configuration for geolocation
const IPSTACK_API_KEY = '00d8db8ff88c4de233d87ad3d38d145f';
const IPSTACK_BASE_URL = 'https://api.ipstack.com/';

// NewsAPI configuration for news headlines
const NEWSAPI_API_KEY = '3ec6966909b74ab1a7340859c992fd83';
const NEWSAPI_BASE_URL = 'https://newsapi.org/v2/top-headlines';

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// Schemas and Models
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

const User = mongoose.model('User', userSchema);

const BlogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
}, { timestamps: true });

const Blog = mongoose.model('Blog', BlogSchema);

// Routes
app.post('/blogs', async (req, res) => {
    try {
        const newBlog = new Blog(req.body);
        await newBlog.save();
        res.status(201).json(newBlog);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/blogs', async (req, res) => {
    try {
        const blogs = await Blog.find();
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/blogs/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        res.json(blog);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/blogs/:id', async (req, res) => {
    try {
        const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedBlog) return res.status(404).json({ message: 'Blog not found' });
        res.json(updatedBlog);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/blogs/:id', async (req, res) => {
    try {
        const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
        if (!deletedBlog) return res.status(404).json({ message: 'Blog not found' });
        res.json({ message: 'Blog deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/send-email', async (req, res) => {
    const { receiverEmail, message } = req.body;

    if (!receiverEmail || !message) {
        return res.status(400).send('Both fields are required.');
    }

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: receiverEmail,
        subject: 'Message from Nodemailer App',
        text: message
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        res.send(`<h1>Email Sent Successfully!</h1><p>${info.response}</p><a href="/nodemailer">Go Back</a>`);
    } catch (error) {
        res.send(`<h1>Error Sending Email</h1><p>${error.message}</p><a href="/nodemailer">Try Again</a>`);
    }
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Store user info in the session
        req.session.user = {
            id: user._id,
            email: user.email,
            role: user.role
        };

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

app.post('/generate-qrcode', (req, res) => {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: "Invalid input" });

    const fileName = `${Date.now()}.png`;
    const qrCodePath = `public/${fileName}`;

    const qrCode = qr.image(link, { type: 'png' });
    qrCode.pipe(fs.createWriteStream(qrCodePath))
        .on('finish', () => {
            res.json({ qrPath: `/${fileName}` });
        });
});

app.get('/qr-code.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'qr-code.png'));
});

app.get('/projects/bmi', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'bmi.html'));
});

app.get('/projects/weather', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'weather.html'));
});

app.get('/projects/blogs', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'blogs.html'));
});

app.get('/projects/qrcode', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'qrcode.html'));
});

app.get('/projects/nodemailer', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'nodemailer.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const checkAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
};

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});


app.get('/admin/users', checkAdmin, async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
});

app.put('/admin/promote/:id', checkAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { role: 'admin' }, { new: true });
        res.json({ message: 'User promoted to Admin', user });
    } catch (error) {
        res.status(500).json({ message: 'Error promoting user', error });
    }
});

app.delete('/admin/delete/:id', checkAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error });
    }
});
app.post('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ message: 'Error logging out' });
        }

        // Clear the session cookie
        res.clearCookie('connect.sid'); // 'connect.sid' is the default name for the session cookie
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

app.get('/check-admin', checkAdmin, (req, res) => {
    res.status(200).json({ message: 'Admin access granted' });
});


app.post('/api/weather', async (req, res) => {
    const { city } = req.body;

    try {
        // Fetch weather data from OpenWeatherAPI
        const weatherResponse = await axios.get(OPENWEATHER_BASE_URL, {
            params: {
                q: city,
                appid: OPENWEATHER_API_KEY,
                units: 'metric',
            },
        });

        const weatherData = weatherResponse.data;
        const coordinates = weatherData.coord;

        // Fetch geolocation data using ipstack API
        const geoResponse = await axios.get(`${IPSTACK_BASE_URL}check?access_key=${IPSTACK_API_KEY}`);
        console.log(geoResponse);
        const geoData = geoResponse.data;

        // Fetch news headlines related to the city using NewsAPI
        const newsResponse = await axios.get(NEWSAPI_BASE_URL, {
            params: {
                q: city,
                apiKey: NEWSAPI_API_KEY,
            },
        });
        const newsData = newsResponse.data.articles;

        res.json({
            weather: {
                temperature: weatherData.main.temp,
                description: weatherData.weather[0].description,
                icon: weatherData.weather[0].icon,
                coordinates: coordinates,
                feels_like: weatherData.main.feels_like,
                humidity: weatherData.main.humidity,
                pressure: weatherData.main.pressure,
                wind_speed: weatherData.wind.speed,
                country: weatherData.sys.country,
                rain_volume: weatherData.rain ? weatherData.rain['3h'] : 'No rain',
            },
            geolocation: {
                city: geoData.city,
                country: geoData.country_name,
                region: geoData.region_name,
            },
            news: newsData,
        });
    } catch (error) {
        console.error('API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));