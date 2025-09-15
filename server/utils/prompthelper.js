

export const generateRulesFallback = (prompt) => {
    console.log('Using fallback pattern matching for prompt:', prompt);
    const rules = [];
    const lowerPrompt = prompt.toLowerCase();
    
    // Pattern matching for spend with various formats
    const spendPatterns = [
        /(?:spent?|spend|spending|purchase[ds]?).*?(?:over|above|more than|greater than|\>)\s*[₹$]?(\d+(?:,\d+)*(?:\.\d+)?)/i,
        /(?:spent?|spend|spending|purchase[ds]?).*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|dollars?|₹|\$)/i,
        /[₹$]\s*(\d+(?:,\d+)*(?:\.\d+)?).*?(?:or more|and above|\+)/i,
        /(\d+(?:,\d+)*(?:\.\d+)?)\s*[₹$].*?(?:or more|and above)/i
    ];
    
    for (const pattern of spendPatterns) {
        const match = lowerPrompt.match(pattern);
        if (match) {
            const value = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(value) && value > 0) {
                rules.push({
                    field: "Total Spend",
                    operator: ">",
                    value: value.toString(),
                    logic: "AND"
                });
                break;
            }
        }
    }
    
    // Pattern matching for visits
    const visitPatterns = [
        /(?:visited?|visits?|came).*?(?:more than|over|above|\>)\s*(\d+)/i,
        /(?:visited?|visits?|came).*?(\d+)\s*(?:times?|visits?)/i,
        /(\d+)\s*(?:or more|\+)\s*(?:visits?|times?)/i
    ];
    
    for (const pattern of visitPatterns) {
        const match = lowerPrompt.match(pattern);
        if (match) {
            const value = parseInt(match[1]);
            if (!isNaN(value) && value >= 0) {
                rules.push({
                    field: "Total Visits",
                    operator: ">",
                    value: value.toString(),
                    logic: "AND"
                });
                break;
            }
        }
    }
    
    // Pattern matching for date-based criteria
    const datePatterns = [
        /(?:haven't visited?|not visited?|inactive|dormant).*?(?:in|for|since).*?(\d+)\s*(months?|days?|weeks?|years?)/i,
        /(?:last visit|visited last).*?(?:over|more than).*?(\d+)\s*(months?|days?|weeks?|years?)/i,
        /(\d+)\s*(months?|days?|weeks?|years?).*?(?:ago|back)/i
    ];
    
    for (const pattern of datePatterns) {
        const match = lowerPrompt.match(pattern);
        if (match) {
            const timeValue = parseInt(match[1]);
            const timeUnit = match[2].toLowerCase();
            
            if (!isNaN(timeValue) && timeValue > 0) {
                const date = new Date();
                if (timeUnit.startsWith('month')) {
                    date.setMonth(date.getMonth() - timeValue);
                } else if (timeUnit.startsWith('week')) {
                    date.setDate(date.getDate() - (timeValue * 7));
                } else if (timeUnit.startsWith('year')) {
                    date.setFullYear(date.getFullYear() - timeValue);
                } else {
                    date.setDate(date.getDate() - timeValue);
                }
                
                rules.push({
                    field: "Last Visit Date",
                    operator: "<",
                    value: date.toISOString().split('T')[0],
                    logic: "AND"
                });
                break;
            }
        }
    }
    
    // Set the last rule's logic to null
    if (rules.length > 0) {
        rules[rules.length - 1].logic = null;
    }
    
    console.log('Generated fallback rules:', rules);
    return rules;
};