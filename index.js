const express = require('express')
const path = require("path")
const app = express()
const port = 3000

app.set('views', __dirname + '/');
app.engine('html', require('ejs').renderFile);

app.use('/public',express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('public/html/homepage.html')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})