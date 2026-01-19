import { Sequelize } from 'sequelize'
import config from '../../config.js'
import pg from 'pg' // Es necesario importar
const conn = pg // Es necesario esta variable

const options = {
    dialect: 'postgres',
    // logging: false,
}

const sequelize = new Sequelize(config.dbUri, options)

export default sequelize