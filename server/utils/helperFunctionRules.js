import db from "../dbConnection.js";

export const validateRules = (rules) => {
    if (!Array.isArray(rules) || rules.length === 0) {
        return { valid: false, message: "Rules must be a non-empty array" };
    }

    const validFields = ['Total Spend', 'Total Visits', 'Last Visit Date'];
    const validOperators = ['>', '<', '='];
    const validLogicOperators = ['AND', 'OR'];

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        
        // Check required properties
        if (typeof rule !== 'object' || rule === null) {
            return { valid: false, message: `Rule ${i + 1} must be an object` };
        }

        if (!validFields.includes(rule.field)) {
            return { valid: false, message: `Rule ${i + 1}: Invalid field "${rule.field}". Must be one of: ${validFields.join(', ')}` };
        }
        
        if (!validOperators.includes(rule.operator)) {
            return { valid: false, message: `Rule ${i + 1}: Invalid operator "${rule.operator}". Must be one of: ${validOperators.join(', ')}` };
        }
        
        if (!rule.value || rule.value.toString().trim() === '') {
            return { valid: false, message: `Rule ${i + 1}: Value is required for field "${rule.field}"` };
        }
        
        // Validate value based on field type
        if (rule.field === 'Total Spend' || rule.field === 'Total Visits') {
            const numValue = parseFloat(rule.value.toString().replace(/[₹$,]/g, ''));
            if (isNaN(numValue) || numValue < 0) {
                return { valid: false, message: `Rule ${i + 1}: ${rule.field} must be a valid positive number` };
            }
        }
        
        if (rule.field === 'Last Visit Date') {
            const dateValue = new Date(rule.value);
            if (isNaN(dateValue.getTime())) {
                return { valid: false, message: `Rule ${i + 1}: Last Visit Date must be a valid date in YYYY-MM-DD format` };
            }
        }
        
        // Check logic operator (not needed for last rule)
        if (i < rules.length - 1 && rule.logic && !validLogicOperators.includes(rule.logic)) {
            return { valid: false, message: `Rule ${i + 1}: Invalid logic operator "${rule.logic}". Must be "AND" or "OR"` };
        }
    }
    
    return { valid: true };
};

// Helper function to build SQL query from rules
export const buildCustomerQuery = (rules, countOnly = false) => {
    if (!rules || rules.length === 0) {
        throw new Error('Rules cannot be empty');
    }

    let baseQuery = countOnly 
        ? 'SELECT COUNT(*) as count FROM customers WHERE '
        : 'SELECT * FROM customers WHERE ';
    
    let conditions = [];
    let params = [];
    let paramCount = 1;
    
    rules.forEach((rule, index) => {
        let condition = '';
        let fieldName = '';
        
        // Map frontend field names to database column names
        switch (rule.field) {
            case 'Total Spend':
                fieldName = 'total_spend';
                break;
            case 'Total Visits':
                fieldName = 'total_visits';
                break;
            case 'Last Visit Date':
                fieldName = 'last_visit';
                break;
            default:
                throw new Error(`Unknown field: ${rule.field}`);
        }
        
        // Build condition based on operator
        switch (rule.operator) {
            case '>':
                condition = `${fieldName} > $${paramCount}`;
                break;
            case '<':
                condition = `${fieldName} < $${paramCount}`;
                break;
            case '=':
                condition = `${fieldName} = $${paramCount}`;
                break;
            default:
                throw new Error(`Unknown operator: ${rule.operator}`);
        }
        
        // Convert value based on field type
        let paramValue = rule.value;
        if (rule.field === 'Total Spend' || rule.field === 'Total Visits') {
            paramValue = parseFloat(rule.value.toString().replace(/[₹$,]/g, ''));
        } else if (rule.field === 'Last Visit Date') {
            paramValue = rule.value;
        }
        
        conditions.push(condition);
        params.push(paramValue);
        paramCount++;
        
        // Add logic operator if not the last rule and logic is specified
        if (index < rules.length - 1 && rule.logic) {
            conditions[conditions.length - 1] += ` ${rule.logic} `;
        }
    });
    
    const query = baseQuery + conditions.join(' ');
    return { query, params };
};

// Helper function to get customers matching the rules
export const getMatchingCustomers = async (rules) => {
    try {
        // Validate rules first
        const validation = validateRules(rules);
        if (!validation.valid) {
            throw new Error(validation.message);
        }
        
        // Build and execute query
        const { query, params } = buildCustomerQuery(rules);
        console.log('Executing query:', query, 'with params:', params);
        
        const result = await db.query(query, params);
        
        return {
            success: true,
            customers: result.rows,
            count: result.rows.length
        };
    } catch (error) {
        console.error('Error getting matching customers:', error);
        return {
            success: false,
            error: error.message,
            customers: [],
            count: 0
        };
    }
};