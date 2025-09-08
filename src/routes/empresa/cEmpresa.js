import { Empresa } from '../../database/models/Empresa.js'

const update = async (req, res) => {
    try {
        const { id } = req.params
        const { colaborador } = req.user
        const {
            ruc, razon_social, nombre_comercial,
            domicilio_fiscal, ubigeo,
            urbanizacion, distrito, provincia, departamento,
            telefono, correo,
            pc_principal_ip, igv_porcentaje,
        } = req.body

       // --- ACTUALIZAR --- //
        const [affectedRows] = await Empresa.update(
            {
                ruc, razon_social, nombre_comercial,
                domicilio_fiscal, ubigeo,
                urbanizacion, distrito, provincia, departamento,
                telefono, correo,
                pc_principal_ip, igv_porcentaje,
                updatedBy: colaborador
            },
            {
                where: { id },
            }
        )

        if (affectedRows > 0) {
            const data = await Empresa.findByPk('1')
            res.json({ code: 0, data })
        }
        else {
            res.json({ code: 1, msg: 'No se actualizó ningún registro' })
        }
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findById = async (req, res) => {
    try {
        const data = await Empresa.findByPk('1')

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}


export default {
    findById,
    update,
}