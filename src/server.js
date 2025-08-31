const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());

const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const recommenderRoutes = require('./routes/recommenderRoutes');
const socialRoutes = require('./routes/socialRoutes');

app.use('/users', userRoutes);
app.use('/books', bookRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/recommendations', recommenderRoutes);
app.use('/social', socialRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor levantado en el puerto ${PORT}`);
});
