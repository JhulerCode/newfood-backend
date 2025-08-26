import sequelize from './sequelize.js'
import "./models/_all.js"
    import initData from './initData.js'
// import { Colaborador } from './models/Colaborador.js'

async function connect() {
    try {
        await sequelize.authenticate()
        console.log('Connection to database has been established successfully.')
    }
    catch (error) {
        console.log('Unable to connect to the database:', error.message)
    }

    // await Colaborador.sync({ alter: true })
    // console.log('Tabla alterada')

    // await sequelize.sync({ force: true })
    // console.log('Base de datos forzada')

    // await initData()
}

export default connect
