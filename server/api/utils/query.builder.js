// This file now contains your rule validation and query building logic.
// I've kept the code the same as it was well-written, just moved it to a dedicated file.

export const validateRules = (rules) => {
    // ... (Your existing validation logic)
    const validFields = ['Total Spend', 'Total Visits', 'Last Visit Date'];
    const validOperators = ['>', '<', '='];
 
    for (const rule of rules) {
        if (!validFields.includes(rule.field)) return { valid: false, message: `Invalid field: ${rule.field}` };
        if (!validOperators.includes(rule.operator)) return { valid: false, message: `Invalid operator: ${rule.operator}` };
        if (!rule.value || String(rule.value).trim() === '') return { valid: false, message: `Value is required for field: ${rule.field}` };
    }
    return { valid: true };
};

export const buildCustomerQuery = (rules, countOnly = false) => {
    // ... (Your existing query building logic)
    const baseQuery = countOnly ? 'SELECT COUNT(*) as count FROM customers WHERE ' : 'SELECT * FROM customers WHERE ';
    const fieldMap = {
        'Total Spend': 'total_spend',
        'Total Visits': 'total_visits',
        'Last Visit Date': 'last_visit'
    };
    
    let conditions = [];
    let params = [];
    
    rules.forEach((rule, index) => {
        const fieldName = fieldMap[rule.field];
        if (!fieldName) throw new Error(`Unknown field: ${rule.field}`);

        const condition = `${fieldName} ${rule.operator} $${index + 1}`;
        conditions.push(condition);
        params.push(rule.value);

        if (index < rules.length - 1 && rule.logic) {
            conditions.push(rule.logic);
        }
    });

    const query = baseQuery + conditions.join(' ');
    return { query, params };
};
