import { Op } from 'sequelize'

function applyFilters(filters = {}) {
    const whereClause = {};

    // procesar todo lo que no sea "or"
    Object.keys(filters).forEach((key) => {
        if (key !== "or") {
            const { op, val, val1 } = filters[key];
            whereClause[key] = buildCondition({ op, val, val1 });
        }
    });

    // procesar OR si existe
    if (filters.or && typeof filters.or === "object") {
        const orConditions = Object.entries(filters.or).map(([field, cond]) => {
            return { [field]: buildCondition(cond) };
        });

        if (orConditions.length > 0) {
            whereClause[Op.or] = orConditions;
        }
    }

    return whereClause;
}

function buildCondition({ op, val, val1 }) {
    switch (op) {
        case "Es": return val;
        case "No es": return { [Op.ne]: val };
        case "Contiene": return { [Op.iLike]: `%${val}%` };
        case "No contiene": return { [Op.notILike]: `%${val}%` };
        case "Empieza con": return { [Op.iLike]: `${val}%` };
        case "Termina con": return { [Op.iLike]: `%${val}` };
        case "Está vacío": return { [Op.is]: null };
        case "No está vacío": return { [Op.not]: null };
        case "Es anterior a": return { [Op.lt]: val };
        case "Es posterior a": return { [Op.gt]: val };
        case "Es igual o anterior a": return { [Op.lte]: val };
        case "Es igual o posterior a": return { [Op.gte]: val };
        case "Está dentro de": return { [Op.between]: [val, val1] };
        case "=": return val;
        case "!=": return { [Op.ne]: val };
        case "<": return { [Op.lt]: val };
        case ">": return { [Op.gt]: val };
        case "<=": return { [Op.lte]: val };
        case ">=": return { [Op.gte]: val };
        default: return val;
    }
}

export {
    applyFilters,
}