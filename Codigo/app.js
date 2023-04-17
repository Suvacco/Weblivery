require('dotenv').config()

const express = require("express") 
const session = require('express-session')

const mongoose = require('mongoose').set('strictQuery', true)
const bodyParser = require("body-parser") 
const ejs = require('ejs') 

const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')

const app = express()

app.set('view engine', 'ejs') 
app.use(express.static(__dirname + '/public')) 
app.use(bodyParser.urlencoded({ extended: true })) 
app.use(session({secret: process.env.SECRET, resave: false, saveUninitialized: true })) 
app.use(passport.initialize()) 
app.use(passport.session()) 

mongoose.connect('mongodb+srv://' + process.env.DB_USER + ':' + process.env.DB_PASS + '@db-cluster.cjjdosp.mongodb.net/weblivery')

const serviceRequestSchema = new mongoose.Schema({
    requesterFullname: String,
    requestTitle: String,
    requestDescription: String,
    email: String,
    whatsapp: String,
    phone: Number
})

const todoItemSchema = new mongoose.Schema({
    title: String,
    content: String
})

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    nickname: String,
    name: String,
    role: String
})

const projectSchema = new mongoose.Schema({
    clientName: String,
    clientEmail: String,
    clientPhone: Number,
    projectName: String,
    projectDescription: String,
    projectOwner: String,
    projectStatus: String,
    projectDeadline: String,
    todolist: [todoItemSchema],
    developers: [userSchema]
})

userSchema.plugin(passportLocalMongoose, {usernameField: 'email'})

const User = new mongoose.model("User", userSchema)

const Project = new mongoose.model("Project", projectSchema)

const ToDoItem = new mongoose.model("ToDoItem", todoItemSchema)

const ServiceRequest = new mongoose.model("ServiceRequest", serviceRequestSchema)

passport.use(User.createStrategy()) 
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

User.register({email: 'admin', name: 'Guilherme Gentili', nickname: 'Ademiro', role: 'Administrador'}, 'admin', (err, newUser) => {
    if (err) {
        console.log('Admin ja criado');
        return
    }
       
    console.log('Admin gerado');
})

/* Logout */

app.get('/logout', (req, res) => {
    if (req.isAuthenticated()) {
        req.logout((err) => {})
        res.redirect('/login')
    }
})

/* Login Page */

app.get('/login', (req, res) => {

    res.render('login')
})

app.post('/login', (req, res) => {
    let user = new User({email: req.body.email, password: req.body.password })

    passport.authenticate('local')(req, res, () => {
        req.login(user, (err) => {})
        res.redirect('/dashboard')
    })
})

/* Service Request Form */

app.get('/', (req, res) => {
    res.render('service-form')
})

app.post('/', (req, res) => {

    const newServiceRequest = new ServiceRequest({
        requesterFullname: req.body.fullname,
        requestTitle: req.body.title,
        requestDescription: req.body.description,
        email: req.body.email,
        phone: req.body.phone,
        whatsapp: req.body.whatsapp
    })

    newServiceRequest.save()

    // TODO: Renderizar uma tela de sucesso
})

/* Dashboard */

app.get('/dashboard', async (req, res) => {
    if (!req.isAuthenticated()) {
        res.redirect('/login')
        return
    }

    const allProjects = await Project.find()

    let restrictProjects = allProjects.filter(project => {
        return project.developers.some((dev) => {
            return dev.email === req.user.email
        })
    })

    if (req.user.email === 'admin') {
        res.render('dashboard', {user: req.user, projects: allProjects})
    } else {
        res.render('dashboard', {user: req.user, projects: restrictProjects})
    }
})

app.get('/dashboard/:projectId', async (req, res) => {
    if (!req.isAuthenticated()) {
        res.redirect('/login')
        return
    }

    let project = await Project.findById(req.params.projectId)

    res.render('project-viewer', {project: project})
})

/* Admin Routes */

app.get('/admin/requests', async (req, res) => {
    if (!req.isAuthenticated()) {
        res.redirect('/login')
        return
    }

    if (req.user.email === 'admin') {
    
        const allServiceRequests = await ServiceRequest.find()

        const allDevelopers = await User.find()

        res.render('service-listing', {requests: allServiceRequests, developers: allDevelopers})
    }
})

app.get('/admin/register', (req, res) => {
    if (!req.isAuthenticated()) {
        res.redirect('/login')
        return
    }

    if (req.user.email === 'admin') {
        res.render('user-register')
    }
})

app.post('/admin/register', (req, res) => {
    if (!req.isAuthenticated()) {
        res.redirect('/login')
        return
    }

    if (req.user.email === 'admin') {
        User.register({
            email: req.body.email,
            name: req.body.fullname,
            role: req.body.role,
            nickname: req.body.nickname

        }, req.body.password, (err, newUser) => { if (err) { console.log(err) }})
        res.redirect('/dashboard')
    }
})

app.post('/admin/requests/accept', async (req, res) => {

    await ServiceRequest.findByIdAndRemove(req.body.id)

    const assignedDevelopers = req.body.assignedDevelopers

    const newProject = new Project({
        clientName: req.body.clientName,
        clientEmail: req.body.clientEmail,
        clientPhone: req.body.clientPhone,
        projectName: req.body.projectName,
        projectDescription: req.body.projectDescription,
        projectOwner: req.user.name,
        projectDeadline: req.body.projectDeadline,
        projectStatus: 'Em Planejamento',
    })

    Promise.all(assignedDevelopers.map(async (developerId) => {
        let foundDeveloper = await User.findById(developerId)

        newProject.developers.push(foundDeveloper)
    })).then(() => {
        newProject.save()
    })

    res.redirect('/dashboard')
})

app.post('/admin/requests/decline', async (req, res) => {
    const requestId = req.body.decline

    await ServiceRequest.findByIdAndRemove(requestId)

    res.redirect('/admin/requests')
})

/* Server Start */

app.listen(3000, () => {
    console.log("Server running");
})