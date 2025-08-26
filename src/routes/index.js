import signin from './_signin/signin.js'
import sistema from './_sistema/rSistema.js'
import verifyToken from '../middlewares/verifyToken.js'

import colaboradores from './colaboradores/rColaboradores.js'
import empresa from './empresa/rEmpresa.js'
import pagoComprobantes from './pago_comprobantes/rPagoComprobantes.js'

function routes(app) {
    app.get('/', (req, res) => {
        res.status(200).send(`Newfood's server is running`)
    })

    app.use('/signin', signin)

    app.use('/api', verifyToken)

    app.use('/api/sistema', sistema)
    app.use('/api/colaboradores', colaboradores)
    app.use('/api/empresa', empresa)
    app.use('/api/pago_comprobantes', pagoComprobantes)
}

export default routes