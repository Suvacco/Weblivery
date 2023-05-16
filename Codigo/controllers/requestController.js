const ServiceRequest = require('../models/ServiceRequest')
const { User } = require('../models/User')
const Project = require('../models/Project')

module.exports = {
    async renderForm(req, res) {
        res.render('service-form')
    },

    async sendForm(req, res) {

        const { requester, title, description, email, phone, whatsapp } = req.body

        const newServiceRequest = new ServiceRequest({
            requester,
            title,
            description,
            email,
            whatsapp,
            phone
        })

        newServiceRequest.save()
    },

    async acceptRequest(req, res) {
        if (!req.isAuthenticated()) {
            res.redirect('/user/login')
            return;
        }

        const { id, clientName, clientEmail, clientPhone, projectName, description, deadline, assignedDevelopers } = req.body
        const { name } = req.user

        await ServiceRequest.findByIdAndRemove(id)
    
        const newProject = new Project({
            clientName,
            clientEmail,
            clientPhone,
            projectName,
            description,
            deadline,
            owner: name,
            status: 0
        })
    
        Promise.all(assignedDevelopers.map(async (developerId) => {

            let foundDeveloper = await User.findById(developerId)
    
            newProject.developers.push(foundDeveloper)

        })).then(() => { newProject.save() })
    
        res.redirect('/user/dashboard')
    },

    async declineRequest(req, res) {
        const { id } = req.body

        await ServiceRequest.findByIdAndRemove(id)
    
        res.redirect('/request/view')
    },

    async viewForms(req, res) {
        if (!req.isAuthenticated()) {
            res.redirect('/user/login')
            return;
        }
    
        if (req.user.email === 'admin') {
        
            const requests = await ServiceRequest.find()
    
            const developers = await User.find()
    
            res.render('service-viewer', {requests, developers})
        }
    }
}