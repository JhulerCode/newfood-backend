import { Op } from 'sequelize'

async function existe(model, where, res, ms) {
    if (where.id) {
        where.id = { [Op.not]: where.id }
    }

    const result = await model.findAll({ where })

    if (result.length > 0) {
        res.json({ code: 1, msg: ms ? ms : 'El nombre ya existe' })
        return true
    }
}

function applyFilters(filters) {
    const whereClause = {}

    Object.keys(filters).forEach((key) => {
        const { op, val, val1 } = filters[key]

        switch (op) {
            case 'Es':
                whereClause[key] = val;
                break;
            case 'No es':
                whereClause[key] = { [Op.ne]: val };
                break;
            case 'Contiene':
                whereClause[key] = { [Op.like]: `%${val}%` };
                break;
            case 'No contiene':
                whereClause[key] = { [Op.notLike]: `%${val}%` };
                break;
            case 'Empieza con':
                whereClause[key] = { [Op.like]: `${val}%` };
                break;
            case 'Termina con':
                whereClause[key] = { [Op.like]: `%${val}` };
                break;
            case 'Está vacío':
                whereClause[key] = { [Op.is]: null };
                break;
            case 'No está vacío':
                whereClause[key] = { [Op.not]: null };
                break;
            case 'Es anterior a':
                whereClause[key] = { [Op.lt]: val };
                break;
            case 'Es posterior a':
                whereClause[key] = { [Op.gt]: val };
                break;
            case 'Es igual o anterior a':
                whereClause[key] = { [Op.lte]: val };
                break;
            case 'Es igual o posterior a':
                whereClause[key] = { [Op.gte]: val };
                break;
            case 'Está dentro de':
                whereClause[key] = { [Op.between]: [val, val1] };
                break;
            case '=':
                whereClause[key] = val;
                break;
            case '!=':
                whereClause[key] = { [Op.ne]: val };
                break;
            case '<':
                whereClause[key] = { [Op.lt]: val };
                break;
            case '>':
                whereClause[key] = { [Op.gt]: val };
                break;
            case '<=':
                whereClause[key] = { [Op.lte]: val };
                break;
            case '>=':
                whereClause[key] = { [Op.gte]: val };
                break;
            default:
                break;
        }
    });

    return whereClause
}

function cleanFloat(num) {
    return Math.round((num + Number.EPSILON) * 1e12) / 1e12;
}

function hasPermiso(permiso, permisos, res) {
    if (permiso.some(p => permisos.includes(p))) {
        return true
    }
    else {
        res.status(403).json({ code: 403, msg: 'No tienes permiso para realizar esta acción' })
        return false
    }
}

export {
    existe,
    applyFilters,
    cleanFloat,
    hasPermiso
}