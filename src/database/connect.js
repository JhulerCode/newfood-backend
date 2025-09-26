import sequelize from './sequelize.js'
import "./models/_all.js"
// import initData from './initData.js'
// import { ArticuloCategoria } from './models/ArticuloCategoria.js'

async function connect() {
    try {
        await sequelize.authenticate()
        console.log('Connection to database has been established successfully.')
    }
    catch (error) {
        console.log('Unable to connect to the database:', error.message)
    }

    // await ArticuloCategoria.sync({ alter: true })
    // console.log('Tabla alterada')

    // await sequelize.sync({ alter: true })
    // console.log('Base de datos alterada')

    // await initData()
}

export default connect
