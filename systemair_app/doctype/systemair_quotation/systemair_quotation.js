frappe.ui.form.on('SystemAir Quotation', {
    onload: function (frm) {
        if (frm.is_new()) {
            frappe.db.get_single_value('SystemAir Settings', 'default_currency_rate').then(value => {
                frm.set_value('default_currency_rate', value);
            });
            // Fetch other defaults if needed, or rely on child table defaults
        }
    },

    total_shipping_amount: function (frm) {
        calculate_totals(frm);
    }
});

frappe.ui.form.on('SystemAir Fan Item', {
    items_add: function (frm, cdt, cdn) {
        // Fetch defaults from Settings
        frappe.db.get_doc('SystemAir Settings').then(settings => {
            let row = locals[cdt][cdn];
            frappe.model.set_value(cdt, cdn, 'currency_rate', settings.default_currency_rate || 1.0);
            frappe.model.set_value(cdt, cdn, 'customs_percentage', settings.default_customs_percentage || 0);
            frappe.model.set_value(cdt, cdn, 'vat_factor', settings.default_vat_factor || 1.14);
            frappe.model.set_value(cdt, cdn, 'cost_factor', settings.default_cost_factor || 1.0);
            frappe.model.set_value(cdt, cdn, 'margin_percentage', settings.default_margin_percentage || 0);
        });
    },

    ex_price: function (frm, cdt, cdn) { calculate_row(frm, cdt, cdn); },
    qty: function (frm, cdt, cdn) { calculate_row(frm, cdt, cdn); },
    discount_percentage: function (frm, cdt, cdn) { calculate_row(frm, cdt, cdn); },
    discount_on_basic_percentage: function (frm, cdt, cdn) { calculate_row(frm, cdt, cdn); },
    customs_percentage: function (frm, cdt, cdn) { calculate_row(frm, cdt, cdn); },
    vat_factor: function (frm, cdt, cdn) { calculate_row(frm, cdt, cdn); },
    cost_factor: function (frm, cdt, cdn) { calculate_row(frm, cdt, cdn); },
    currency_rate: function (frm, cdt, cdn) { calculate_row(frm, cdt, cdn); },
    margin_percentage: function (frm, cdt, cdn) { calculate_row(frm, cdt, cdn); }
});

function calculate_row(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    // 1. Basic T EX Price
    // Formula: EX Price * Qty * (1 - Discount)
    let basic_t_ex_price = (row.ex_price || 0) * (row.qty || 1) * (1 - (row.discount_percentage || 0) / 100);
    frappe.model.set_value(cdt, cdn, 'basic_t_ex_price', basic_t_ex_price);

    // Trigger total calculation to redistribute shipping
    calculate_totals(frm);
}

function calculate_totals(frm) {
    let items = frm.doc.items || [];
    let total_basic_price = 0;

    // 1. Sum Basic T EX Price
    items.forEach(item => {
        total_basic_price += item.basic_t_ex_price || 0;
    });

    let total_shipping = frm.doc.total_shipping_amount || 0;
    let grand_total = 0;

    // 2. Distribute Shipping and Calculate Final Prices
    items.forEach(item => {
        // Shipping Fee
        let shipping_fee = 0;
        if (total_basic_price > 0) {
            shipping_fee = (item.basic_t_ex_price / total_basic_price) * total_shipping;
        }
        frappe.model.set_value(item.doctype, item.name, 'shipping_fee', shipping_fee);

        // Final T EX Price
        // Formula: Basic T EX Price * (1 - Discount on Basic)
        let final_t_ex_price = item.basic_t_ex_price * (1 - (item.discount_on_basic_percentage || 0) / 100);
        frappe.model.set_value(item.doctype, item.name, 'final_t_ex_price', final_t_ex_price);

        // CIF
        // Formula: Final T EX Price + Shipping Fee
        let cif = final_t_ex_price + shipping_fee;
        frappe.model.set_value(item.doctype, item.name, 'cif', cif);

        // Dry DDP Cost
        // Formula: CIF * Cost Factor * Currency Rate * VAT Factor * (1 + Customs %)
        let customs_multiplier = 1 + (item.customs_percentage || 0) / 100;
        let dry_ddp_cost = cif * (item.cost_factor || 1) * (item.currency_rate || 1) * (item.vat_factor || 1) * customs_multiplier;
        frappe.model.set_value(item.doctype, item.name, 'dry_ddp_cost', dry_ddp_cost);

        // Total Price
        // Formula: Dry DDP Cost * (1 + Margin %)
        let margin_multiplier = 1 + (item.margin_percentage || 0) / 100;
        let total_price = dry_ddp_cost * margin_multiplier;
        frappe.model.set_value(item.doctype, item.name, 'total_price', total_price);

        // Unit Price
        // Formula: Total Price / Qty
        let unit_price = 0;
        if (item.qty > 0) {
            unit_price = total_price / item.qty;
        }
        frappe.model.set_value(item.doctype, item.name, 'unit_price', unit_price);

        grand_total += total_price;
    });

    frappe.model.set_value(frm.doctype, frm.docname, 'total_amount', grand_total);
}
