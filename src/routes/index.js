import signin from './_signin/signin.js'
import sistema from './_sistema/rSistema.js'
import verifyToken from '../middlewares/verifyToken.js'

import colaboradores from './colaboradores/rColaboradores.js'
import empresa from './empresa/rEmpresa.js'

function routes(app) {
    app.get('/', (req, res) => {
        res.status(200).send(`Newfood's server is running`)
    })

    app.use('/signin', signin)

    app.use('/api', verifyToken)

    app.use('/api/sistema', sistema)
    app.use('/api/colaboradores', colaboradores)
    app.use('/api/empresa', empresa)
}

export default routes