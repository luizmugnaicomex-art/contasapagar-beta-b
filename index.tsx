/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

// FIX: Declare firebase and Chart as a global constant to satisfy TypeScript compiler.
declare const firebase: any;
declare const Chart: any;
declare const XLSX: any;

type Currency = 'BRL' | 'USD' | 'CNY';
type Language = 'pt-BR' | 'en' | 'zh-CN';
type ApprovalStatus = 'Pendente' | 'Aprovado' | 'Rejeitado';
type CategoriaType = 'Receita' | 'Despesa';

// --- Data Interfaces ---
interface Fornecedor {
    id: string;
    name: string;
}

interface Categoria {
    id: string;
    group: string;
    name: string;
    type: CategoriaType;
}

interface Orcamento {
    id: string;
    year: number;
    month: number; // 1-12
    categoriaId: string;
    amount: number;
}

interface ContaPagar {
    id: string;
    cpNumber: string;
    fornecedorId: string;
    categoriaId: string;
    bl: string;
    po: string;
    nf: string;
    migo: string; // Goods Receipt
    miro: string; // Invoice Receipt
    vencimento: string; // YYYY-MM-DD
    paymentTerm: string;
    valor: number; // Always in BRL for consistent calculations
    valorOriginal: number; // Value in the original currency
    currency: Currency;
    status: 'Pendente' | 'Pago';
    observacoes: string;
    costCenter?: string;
    cargo?: string;
    incoterm?: string;
    diDate?: string;
    sapPo?: string;
    diNumber?: string;
    vesselName?: string;
    voyage?: string;
    nfType?: string;
    nfEmissionDate?: string;
    prNumber?: string;
    prEmissionDate?: string;
    sapPoEmissionDate?: string;
    nfImportNumber?: string;
    paymentMethod?: string;
    paymentDate?: string; // Actual date of payment
    cfop?: string;
    isAdiantamento?: boolean;
    reconciled?: boolean;
    approvalStatus: ApprovalStatus;
    createdAt: any; // Firestore Timestamp
    numberOfCars?: number;
    isUniqueDi?: boolean;
}

interface NotificationSettings {
    enabled: boolean;
    leadTimeDays: number;
    email: string;
    language?: Language;
}

interface CashEntry {
    id: string;
    description: string;
    type: 'Entrada' | 'Saída';
    estimatedDate: string; // YYYY-MM-DD
    realizedDate?: string; // YYYY-MM-DD
    value: number;
    categoriaId?: string;
    relatedCpId?: string;
    reference?: string;
}

interface FupData {
    id: string;
    [key: string]: any;
}

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDHS0jZpQuhGngiWtmWWhtjPvUUc_n38dA",
  authDomain: "contas-a-pagar-byd.firebaseapp.com",
  projectId: "contas-a-pagar-byd",
  storageBucket: "contas-a-pagar-byd.appspot.com",
  messagingSenderId: "691651273112",
  appId: "1:691651273112:web:fb4098cf50720167e54bed",
  measurementId: "G-Q69PF1MNJ5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Admin UIDs ---
const ADMIN_UIDS = ['g8P9gZqOn7NGVZLSx1TszRZqsse2', 'X456dNxA3hSlq9LGicR7iTPUP3t2'];
const SHARED_DATA_OWNER_UID = 'g8P9gZqOn7NGVZLSx1TszRZqsse2'; // All users will read/write from this user's data space.


// --- Translation ---
const translations = {
    'pt-BR': {
        login_title: 'Sistema de Contas a Pagar', login_email_label: 'Email', login_password_label: 'Senha', login_button: 'Entrar', login_error: 'Email ou senha inválidos.',
        header_welcome: 'Olá', header_logout_button: 'Sair',
        header_title: 'Controle de Contas a Pagar', header_suppliers_button: 'Fornecedores', header_categories_button: 'Categorias', header_settings_button: 'Configurações',
        stat_total_payable: 'Total a Pagar', stat_due_today: 'Vencendo Hoje', stat_overdue: 'Em Atraso', stat_paid_in_month: 'Pago no Mês',
        tab_entries: 'Lançamentos', tab_analysis: 'Análise Gráfica', tab_cost_bl: 'Custos por BL', tab_cost_po: 'Custos por PO', tab_cost_di: 'Custos por DI', tab_fup_report: 'Relatório FUP', tab_database: 'Banco de Dados', tab_conciliation: 'Conciliação', tab_cash_flow: 'Fluxo de Caixa', tab_budget_control: 'Controle Orçamentário',
        entries_title: 'Lançamentos (CP)', new_entry_button: 'Novo Lançamento',
        filter_search_placeholder: 'Buscar por CP, Fornecedor, MIGO...', filter_status_label: 'Status:', filter_status_all: 'Todos Status', filter_status_pending: 'Pendente', filter_status_overdue: 'Atrasado', filter_status_paid: 'Pago',
        filter_date_from: 'De:', filter_date_to: 'Até:', clear_filters_button: 'Limpar Filtros',
        table_header_cp_number: 'Nº CP', table_header_status: 'Status', table_header_due_date: 'Vencimento', table_header_payment_term: 'Cond. Pagamento', table_header_supplier: 'Fornecedor', table_header_category: 'Categoria', table_header_value: 'Valor', table_header_references: 'Referências', table_header_actions: 'Ações', table_header_approval_status: 'Aprovação', table_header_voyage: 'Voyage',
        empty_state_no_entries_filtered: 'Nenhum lançamento encontrado para os filtros aplicados.', empty_state_no_entries: 'Nenhum lançamento encontrado.', empty_state_get_started: 'Clique em "Novo Lançamento" para começar.',
        action_title_edit: 'Editar', action_title_mark_paid: 'Marcar como Pago', action_title_delete: 'Excluir', action_title_approve: 'Aprovar', action_title_reject: 'Rejeitar', action_title_reconcile: 'Marcar como Conciliado',
        status_pending: 'Pendente', status_overdue: 'Atrasado', status_paid: 'Pago',
        approval_status_pending: 'Pendente', approval_status_approved: 'Aprovado', approval_status_rejected: 'Rejeitado',
        analysis_chart_title_by_category: 'Despesas por Categoria', analysis_chart_title_top_suppliers: 'Top 5 Fornecedores', analysis_chart_title_monthly_payments: 'Pagamentos Mensais (Últimos 12 Meses)', analysis_chart_title_monthly_extra_costs: 'Custos Extras Mensais (Últimos 12 Meses)',
        chart_empty_state: 'Nenhum dado para exibir.', chart_label_total_value_paid: 'Valor Total Pago', chart_legend_paid: 'Pago', chart_legend_pending: 'Pendente',
        grouped_view_total_cost: 'Custo Total',
        bl_empty_state: 'Nenhum custo associado a um BL encontrado.', po_empty_state: 'Nenhum custo associado a um PO encontrado.', di_empty_state: 'Nenhum custo associado a um Nº de DI encontrado.',
        fup_title: 'Relatório FUP - Custos Consolidados por Operação', fup_export_xlsx: 'Exportar XLSX', fup_description: 'Este relatório consolida todos os custos agrupados por BL e PO. Os filtros de data aplicados na aba "Lançamentos" também se aplicam aqui.', fup_empty_state: 'Nenhum dado de operação encontrado para gerar o relatório.', fup_empty_state_hint: 'Certifique-se de que os lançamentos possuem BL e PO preenchidos.',
        cp_modal_title_new: 'Novo Lançamento de CP', cp_modal_title_edit: 'Editar Lançamento de CP', form_label_supplier: 'Fornecedor', form_label_category_expense: 'Categoria/Despesa', form_section_operation_data: 'Dados da Operação', form_label_cost_center: 'Centro de Custo', form_label_cargo: 'Carga', form_placeholder_cargo: 'Ex: VEÍCULOS', form_label_di_date: 'Data DI', form_label_sap_po: 'PO SAP', form_placeholder_sap_po: 'Ex: 4500...',
        form_section_sap_docs: 'Documentos de Referência (SAP)', form_label_nf_number: 'Nº da NF', form_label_migo_number: 'Nº MIGO', form_label_miro_number: 'Nº MIRO',
        form_label_due_date: 'Data de Vencimento', form_label_payment_term: 'Cond. Pagamento', form_placeholder_payment_term: 'Ex: 30 dias', form_label_currency: 'Moeda', form_label_value: 'Valor', form_label_status: 'Status', form_label_observations: 'Observações', form_placeholder_observations: 'Informações adicionais sobre este lançamento...',
        form_placeholder_select_category: 'Selecione uma categoria...',
        form_placeholder_select_supplier: 'Selecione um fornecedor...',
        button_cancel: 'Cancelar', button_save: 'Salvar', button_close: 'Fechar', button_send: 'Enviar',
        suppliers_modal_title: 'Cadastro de Fornecedores', form_placeholder_supplier_name: 'Nome do Fornecedor',
        categories_modal_title: 'Cadastro de Categorias', form_placeholder_category_group: 'Grupo da Categoria (Ex: Custos Fixos)', form_placeholder_category_name: 'Nome da Categoria', form_label_category_type: 'Tipo', category_type_revenue: 'Receita', category_type_expense: 'Despesa', button_add_category: 'Adicionar Categoria',
        category_international: 'Custos Internacionais', category_government_taxes: 'Impostos Governamentais', category_government_fees: 'Taxas Governamentais', category_customs_broker: 'Despachante Aduaneiro', category_storage: 'Custos de Armazenagem', category_transport: 'Custos de Transporte', category_destination: 'Custos de Destino', category_extra: 'Custos Extras', category_other: 'Outros',
        settings_modal_title: 'Configurações de Notificação', settings_enable_email: 'Ativar notificações por e-mail', settings_notify_days: 'Notificar com antecedência de (dias)', settings_email_for_notifications: 'E-mail para notificações', settings_email_placeholder: 'seu.email@exemplo.com',
        toast_supplier_updated: 'Fornecedor atualizado com sucesso!', toast_supplier_added: 'Fornecedor adicionado com sucesso!', toast_supplier_deleted: 'Fornecedor excluído.', toast_category_updated: 'Categoria atualizada com sucesso!', toast_category_added: 'Categoria adicionada com sucesso!', toast_category_deleted: 'Categoria excluída.',
        toast_entry_updated: 'Lançamento atualizado com sucesso!', toast_entry_saved: 'Lançamento salvo com sucesso!', toast_entry_paid: 'Lançamento marcado como pago!', toast_entry_deleted: 'Lançamento excluído.', toast_entry_approved: 'Lançamento aprovado!', toast_entry_rejected: 'Lançamento rejeitado!', toast_entry_reconciled: 'Adiantamento conciliado com sucesso!',
        toast_settings_saved: 'Configurações salvas com sucesso!', toast_no_data_to_export: 'Nenhum dado para exportar.', toast_report_exported: 'Relatório exportado com sucesso!', toast_action_not_allowed: 'Ação não permitida para este usuário.',
        password_modal_title: 'Confirmação Necessária', password_modal_text: 'Para continuar, por favor, insira a senha para confirmar esta ação.', password_modal_label: 'Senha', password_modal_placeholder: '********', password_modal_confirm_action_button: 'Confirmar Ação', password_modal_error: 'Senha incorreta. Tente novamente.',
        confirm_delete_supplier: 'Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.',
        confirm_delete_category: 'Tem certeza que deseja excluir esta categoria?',
        ai_modal_title: 'Assistente de CP', ai_welcome_message: 'Olá! Sou seu assistente de Contas a Pagar. Faça uma pergunta sobre seus lançamentos. Por exemplo: "Qual o total a pagar para a Maersk Line?"', ai_input_placeholder: 'Faça uma pergunta...', ai_error_generic: 'Desculpe, não consegui processar sua solicitação.', ai_system_instruction: "Você é um assistente financeiro especialista em Contas a Pagar para uma empresa que usa SAP. Responda a perguntas com base nos dados JSON fornecidos. Os dados contêm 'fornecedores', 'categorias', e 'contasPagar'. 'migo' é a entrada de mercadoria e 'miro' é o registro de fatura. Seja conciso e direto. Formate valores monetários como R$ 1.234,56. Responda em Português do Brasil.",
        form_label_di_number: 'Nº da DI', form_label_vessel_name: 'Nome do Navio', form_label_voyage: 'Voyage', form_label_nf_type: 'Tipo de NF', form_label_nf_emission_date: 'Data Emissão NF', form_label_pr_number: 'Nº da PR', form_label_pr_emission_date: 'Data Emissão PR', form_label_sap_po_emission_date: 'Data Emissão PO SAP', form_label_nf_import_number: 'Nº NF Importação', form_label_payment_method: 'Método de Pagamento', form_label_payment_date: 'Data de Pagamento', form_label_cfop: 'CFOP', form_label_is_adiantamento: 'Adiantamento?',
        database_title: 'Banco de Dados - FUP', database_upload_prompt: 'Clique para carregar o arquivo FUP (.xlsx)', database_table_header_bl: 'BL/AWB', database_table_header_po: 'PO SAP', database_table_header_vessel: 'Navio', database_table_header_voyage: 'Voyage', database_table_header_di: 'Nº DI', database_table_header_eta: 'ETA', database_empty_state: 'Nenhum dado de FUP carregado.', toast_fup_loaded: 'Dados do FUP carregados com sucesso!', toast_fup_error: 'Erro ao carregar o arquivo FUP.',
        conciliation_title: 'Conciliação de Adiantamentos', conciliation_empty_state: 'Nenhum adiantamento encontrado.', conciliation_empty_state_filtered: 'Nenhum adiantamento pendente encontrado com o filtro aplicado.', conciliation_filter_pending_only: 'Mostrar somente pendentes', table_header_reconciliation_status: 'Status Conciliação', reconciliation_status_pending: 'Pendente', reconciliation_status_reconciled: 'Conciliado',
        filter_db_placeholder: 'Buscar por BL/AWB, PO SAP, Navio ou Nº DI...',
        filter_bl_placeholder: 'Buscar por BL...',
        filter_po_placeholder: 'Buscar por PO...',
        filter_di_placeholder: 'Buscar por Nº DI...',
        upload_history_button: 'Upload Histórico',
        download_template_button: 'Baixar Template',
        toast_history_loaded: 'Histórico importado com sucesso!',
        toast_history_error: 'Erro ao importar histórico. Verifique o formato do arquivo.',
        cash_flow_title: 'Fluxo de Caixa', cash_flow_period_label: 'Período:', cash_flow_period_this_month: 'Este Mês', cash_flow_period_next_30: 'Próximos 30 Dias', cash_flow_period_this_quarter: 'Este Trimestre', cash_flow_new_entry_button: 'Nova Entrada/Saída', cash_flow_kpi_opening_balance: 'Saldo Inicial', cash_flow_kpi_inflows: 'Entradas', cash_flow_kpi_outflows: 'Saídas', cash_flow_kpi_closing_balance: 'Saldo Final', cash_flow_chart_title: 'Posição de Caixa Diária (Estimado vs. Realizado)', cash_flow_table_title: 'Movimentações de Caixa', cash_flow_table_header_date: 'Data', cash_flow_table_header_description: 'Descrição', cash_flow_table_header_type: 'Tipo', cash_flow_table_header_estimated: 'Valor Estimado', cash_flow_table_header_realized: 'Valor Realizado', cash_flow_table_header_status: 'Status', cash_flow_table_empty: 'Nenhuma movimentação no período.', cash_entry_modal_title: 'Novo Lançamento de Caixa', cash_entry_label_description: 'Descrição', cash_entry_label_type: 'Tipo', cash_entry_label_value: 'Valor (BRL)', cash_entry_label_estimated_date: 'Data Estimada', cash_entry_label_realized_date: 'Data Realizada', cash_entry_type_inflow: 'Entrada', cash_entry_type_outflow: 'Saída', toast_cash_entry_saved: 'Lançamento de caixa salvo!',
        budget_control_title: 'Controle Orçamentário (Orçado vs. Realizado)', budget_set_button: 'Definir Orçamento', budget_modal_title: 'Definir Orçamento para', table_header_budgeted: 'Orçado', table_header_actual: 'Realizado', table_header_variance: 'Diferença', total_revenues: 'Total de Receitas', total_expenses: 'Total de Despesas', net_result: 'Resultado Líquido', toast_budget_saved: 'Orçamento salvo com sucesso!', budget_empty_state: 'Nenhum dado orçamentário para o período selecionado.', budget_empty_state_hint: 'Clique em "Definir Orçamento" para começar.',
        cash_flow_table_header_reference: 'Referência', cash_entry_label_reference: 'Referência (BL/PO/DI)', cash_entry_placeholder_reference: 'Ex: PO-12345',
        form_label_number_of_cars: 'Nº de Carros', form_label_unique_di: 'DI Única', option_yes: 'Sim', option_no: 'Não',
        expand_all: 'Expandir Tudo', collapse_all: 'Recolher Tudo',
        delete_all_entries_button: 'Limpar Lançamentos',
        confirm_delete_all_entries: 'Tem certeza que deseja excluir TODOS os lançamentos? Esta ação é irreversível e removerá permanentemente todos os dados de Contas a Pagar.',
        toast_all_entries_deleted: 'Todos os lançamentos foram excluídos com sucesso!',
        export_excel_button: 'Exportar Excel',
    },
    'en': {
        login_title: 'Accounts Payable System', login_email_label: 'Email', login_password_label: 'Password', login_button: 'Login', login_error: 'Invalid email or password.',
        header_welcome: 'Hello', header_logout_button: 'Logout',
        header_title: 'Accounts Payable Control', header_suppliers_button: 'Suppliers', header_categories_button: 'Categories', header_settings_button: 'Settings',
        stat_total_payable: 'Total Payable', stat_due_today: 'Due Today', stat_overdue: 'Overdue', stat_paid_in_month: 'Paid this Month',
        tab_entries: 'Entries', tab_analysis: 'Chart Analysis', tab_cost_bl: 'Costs by BL', tab_cost_po: 'Costs by PO', tab_cost_di: 'Costs by DI', tab_fup_report: 'FUP Report', tab_database: 'Database', tab_conciliation: 'Reconciliation', tab_cash_flow: 'Cash Flow', tab_budget_control: 'Budget Control',
        entries_title: 'AP Entries', new_entry_button: 'New Entry',
        filter_search_placeholder: 'Search by AP, Supplier, MIGO...', filter_status_label: 'Status:', filter_status_all: 'All Statuses', filter_status_pending: 'Pending', filter_status_overdue: 'Overdue', filter_status_paid: 'Paid',
        filter_date_from: 'From:', filter_date_to: 'To:', clear_filters_button: 'Clear Filters',
        table_header_cp_number: 'AP No.', table_header_status: 'Status', table_header_due_date: 'Due Date', table_header_payment_term: 'Payment Term', table_header_supplier: 'Supplier', table_header_category: 'Category', table_header_value: 'Value', table_header_references: 'References', table_header_actions: 'Actions', table_header_approval_status: 'Approval', table_header_voyage: 'Voyage',
        empty_state_no_entries_filtered: 'No entries found for the applied filters.', empty_state_no_entries: 'No entries found.', empty_state_get_started: 'Click on "New Entry" to get started.',
        action_title_edit: 'Edit', action_title_mark_paid: 'Mark as Paid', action_title_delete: 'Delete', action_title_approve: 'Approve', action_title_reject: 'Reject', action_title_reconcile: 'Mark as Reconciled',
        status_pending: 'Pending', status_overdue: 'Overdue', status_paid: 'Paid',
        approval_status_pending: 'Pending', approval_status_approved: 'Approved', approval_status_rejected: 'Rejected',
        analysis_chart_title_by_category: 'Expenses by Category', analysis_chart_title_top_suppliers: 'Top 5 Suppliers', analysis_chart_title_monthly_payments: 'Monthly Payments (Last 12 Months)', analysis_chart_title_monthly_extra_costs: 'Monthly Extra Costs (Last 12 Months)',
        chart_empty_state: 'No data to display.', chart_label_total_value_paid: 'Total Amount Paid', chart_legend_paid: 'Paid', chart_legend_pending: 'Pending',
        grouped_view_total_cost: 'Total Cost',
        bl_empty_state: 'No costs associated with a BL were found.', po_empty_state: 'No costs associated with a PO were found.', di_empty_state: 'No costs associated with a DI No. were found.',
        fup_title: 'FUP Report - Consolidated Costs by Operation', fup_export_xlsx: 'Export XLSX', fup_description: 'This report consolidates all costs grouped by BL and PO. The date filters applied in the "Entries" tab also apply here.', fup_empty_state: 'No operation data found to generate the report.', fup_empty_state_hint: 'Ensure that entries have both BL and PO fields filled.',
        cp_modal_title_new: 'New AP Entry', cp_modal_title_edit: 'Edit AP Entry', form_label_supplier: 'Supplier', form_label_category_expense: 'Category/Expense', form_section_operation_data: 'Operation Data', form_label_cost_center: 'Cost Center', form_label_cargo: 'Cargo', form_placeholder_cargo: 'e.g., VEHICLES', form_label_di_date: 'DI Date', form_label_sap_po: 'SAP PO#', form_placeholder_sap_po: 'e.g., 4500...',
        form_section_sap_docs: 'Reference Documents (SAP)', form_label_nf_number: 'Invoice No.', form_label_migo_number: 'MIGO No.', form_label_miro_number: 'MIRO No.',
        form_label_due_date: 'Due Date', form_label_payment_term: 'Payment Term', form_placeholder_payment_term: 'e.g., 30 days', form_label_currency: 'Currency', form_label_value: 'Value', form_label_status: 'Status', form_label_observations: 'Observations', form_placeholder_observations: 'Additional information about this entry...',
        form_placeholder_select_category: 'Select a category...',
        form_placeholder_select_supplier: 'Select a supplier...',
        button_cancel: 'Cancel', button_save: 'Save', button_close: 'Close', button_send: 'Send',
        suppliers_modal_title: 'Supplier Registration', form_placeholder_supplier_name: 'Supplier Name',
        categories_modal_title: 'Category Registration', form_placeholder_category_group: 'Category Group (e.g., Fixed Costs)', form_placeholder_category_name: 'Category Name', form_label_category_type: 'Type', category_type_revenue: 'Revenue', category_type_expense: 'Expense', button_add_category: 'Add Category',
        category_international: 'International Costs', category_government_taxes: 'Government Taxes', category_government_fees: 'Government Fees', category_customs_broker: 'Customs Broker', category_storage: 'Storage Costs', category_transport: 'Transportation Costs', category_destination: 'Destination Costs', category_extra: 'Extra Costs', category_other: 'Other',
        settings_modal_title: 'Notification Settings', settings_enable_email: 'Enable email notifications', settings_notify_days: 'Notify in advance by (days)', settings_email_for_notifications: 'Email for notifications', settings_email_placeholder: 'your.email@example.com',
        toast_supplier_updated: 'Supplier updated successfully!', toast_supplier_added: 'Supplier added successfully!', toast_supplier_deleted: 'Supplier deleted.', toast_category_updated: 'Category updated successfully!', toast_category_added: 'Category added successfully!', toast_category_deleted: 'Category deleted.',
        toast_entry_updated: 'Entry updated successfully!', toast_entry_saved: 'Entry saved successfully!', toast_entry_paid: 'Entry marked as paid!', toast_entry_deleted: 'Entry deleted.', toast_entry_approved: 'Entry approved!', toast_entry_rejected: 'Entry rejected!', toast_entry_reconciled: 'Advance payment reconciled!',
        toast_settings_saved: 'Settings saved successfully!', toast_no_data_to_export: 'No data to export.', toast_report_exported: 'Report exported successfully!', toast_action_not_allowed: 'Action not allowed for this user.',
        password_modal_title: 'Confirmation Required', password_modal_text: 'To proceed, please enter the password to confirm this action.', password_modal_label: 'Password', password_modal_placeholder: '********', password_modal_confirm_action_button: 'Confirm Action', password_modal_error: 'Incorrect password. Please try again.',
        confirm_delete_supplier: 'Are you sure you want to delete this supplier? This action cannot be undone.',
        confirm_delete_category: 'Are you sure you want to delete this category?',
        ai_modal_title: 'AP Assistant', ai_welcome_message: 'Hello! I am your Accounts Payable assistant. Ask a question about your entries. For example: "What is the total payable to Maersk Line?"', ai_input_placeholder: 'Ask a question...', ai_error_generic: 'Sorry, I could not process your request.', ai_system_instruction: "You are an expert financial assistant for Accounts Payable in a company that uses SAP. Answer questions based on the provided JSON data. The data contains 'suppliers', 'categories', and 'accountsPayable'. 'migo' is the goods receipt and 'miro' is the invoice receipt. Be concise and direct. Format monetary values like $1,234.56. Respond in English.",
        form_label_di_number: 'DI No.', form_label_vessel_name: 'Vessel Name', form_label_voyage: 'Voyage', form_label_nf_type: 'Invoice Type', form_label_nf_emission_date: 'Invoice Issue Date', form_label_pr_number: 'PR No.', form_label_pr_emission_date: 'PR Issue Date', form_label_sap_po_emission_date: 'SAP PO Issue Date', form_label_nf_import_number: 'Import Invoice No.', form_label_payment_method: 'Payment Method', form_label_payment_date: 'Payment Date', form_label_cfop: 'CFOP', form_label_is_adiantamento: 'Advance Payment?',
        database_title: 'Database - FUP', database_upload_prompt: 'Click to upload the FUP file (.xlsx)', database_table_header_bl: 'BL/AWB', database_table_header_po: 'PO SAP', database_table_header_vessel: 'Vessel', database_table_header_voyage: 'Voyage', database_table_header_di: 'DI No.', database_table_header_eta: 'ETA', database_empty_state: 'No FUP data loaded.', toast_fup_loaded: 'FUP data loaded successfully!', toast_fup_error: 'Error loading FUP file.',
        conciliation_title: 'Advance Payment Reconciliation', conciliation_empty_state: 'No advance payments found.', conciliation_empty_state_filtered: 'No pending advance payments found with the filter applied.', conciliation_filter_pending_only: 'Show pending only', table_header_reconciliation_status: 'Reconciliation Status', reconciliation_status_pending: 'Pending', reconciliation_status_reconciled: 'Reconciled',
        filter_db_placeholder: 'Search by BL/AWB, SAP PO, Vessel or DI No...',
        filter_bl_placeholder: 'Search by BL...',
        filter_po_placeholder: 'Search by PO...',
        filter_di_placeholder: 'Search by DI No...',
        upload_history_button: 'Upload History',
        download_template_button: 'Download Template',
        toast_history_loaded: 'History imported successfully!',
        toast_history_error: 'Error importing history. Please check file format.',
        cash_flow_title: 'Cash Flow', cash_flow_period_label: 'Period:', cash_flow_period_this_month: 'This Month', cash_flow_period_next_30: 'Next 30 Days', cash_flow_period_this_quarter: 'This Quarter', cash_flow_new_entry_button: 'New Inflow/Outflow', cash_flow_kpi_opening_balance: 'Opening Balance', cash_flow_kpi_inflows: 'Inflows', cash_flow_kpi_outflows: 'Outflows', cash_flow_kpi_closing_balance: 'Closing Balance', cash_flow_chart_title: 'Daily Cash Position (Estimated vs. Actual)', cash_flow_table_title: 'Cash Movements', cash_flow_table_header_date: 'Date', cash_flow_table_header_description: 'Description', cash_flow_table_header_type: 'Type', cash_flow_table_header_estimated: 'Estimated Value', cash_flow_table_header_realized: 'Actual Value', cash_flow_table_header_status: 'Status', cash_flow_table_empty: 'No movements in the period.', cash_entry_modal_title: 'New Cash Entry', cash_entry_label_description: 'Description', cash_entry_label_type: 'Type', cash_entry_label_value: 'Value (BRL)', cash_entry_label_estimated_date: 'Estimated Date', cash_entry_label_realized_date: 'Actual Date', cash_entry_type_inflow: 'Inflow', cash_entry_type_outflow: 'Outflow', toast_cash_entry_saved: 'Cash entry saved!',
        budget_control_title: 'Budget Control (Budgeted vs. Actual)', budget_set_button: 'Set Budget', budget_modal_title: 'Set Budget for', table_header_budgeted: 'Budgeted', table_header_actual: 'Actual', table_header_variance: 'Variance', total_revenues: 'Total Revenues', total_expenses: 'Total Expenses', net_result: 'Net Result', toast_budget_saved: 'Budget saved successfully!', budget_empty_state: 'No budget data for the selected period.', budget_empty_state_hint: 'Click "Set Budget" to get started.',
        cash_flow_table_header_reference: 'Reference', cash_entry_label_reference: 'Reference (BL/PO/DI)', cash_entry_placeholder_reference: 'e.g., PO-12345',
        form_label_number_of_cars: 'Number of Cars', form_label_unique_di: 'Unique DI', option_yes: 'Yes', option_no: 'No',
        expand_all: 'Expand All', collapse_all: 'Collapse All',
        delete_all_entries_button: 'Clear All Entries',
        confirm_delete_all_entries: 'Are you sure you want to delete ALL entries? This action is irreversible and will permanently remove all Accounts Payable data.',
        toast_all_entries_deleted: 'All entries have been deleted successfully!',
        export_excel_button: 'Export Excel',
    },
    'zh-CN': {
        login_title: '应付账款系统', login_email_label: '电子邮件', login_password_label: '密码', login_button: '登录', login_error: '无效的电子邮件或密码。',
        header_welcome: '你好', header_logout_button: '登出',
        header_title: '应付账款控制', header_suppliers_button: '供应商', header_categories_button: '类别', header_settings_button: '设置',
        stat_total_payable: '应付总额', stat_due_today: '今日到期', stat_overdue: '已逾期', stat_paid_in_month: '本月已付',
        tab_entries: '账目', tab_analysis: '图表分析', tab_cost_bl: '按提单成本', tab_cost_po: '按订单成本', tab_cost_di: '按进口报关单成本', tab_fup_report: 'FUP报告', tab_database: '数据库', tab_conciliation: '对账', tab_cash_flow: '现金流', tab_budget_control: '预算控制',
        entries_title: '应付账款 (AP)', new_entry_button: '新账目',
        filter_search_placeholder: '按AP号、供应商、MIGO搜索...', filter_status_label: '状态:', filter_status_all: '所有状态', filter_status_pending: '待处理', filter_status_overdue: '已逾期', filter_status_paid: '已支付',
        filter_date_from: '从:', filter_date_to: '至:', clear_filters_button: '清除筛选',
        table_header_cp_number: 'AP编号', table_header_status: '状态', table_header_due_date: '到期日', table_header_payment_term: '付款条件', table_header_supplier: '供应商', table_header_category: '类别', table_header_value: '金额', table_header_references: '参考', table_header_actions: '操作', table_header_approval_status: '审批', table_header_voyage: '航次',
        empty_state_no_entries_filtered: '未找到符合筛选条件的账目。', empty_state_no_entries: '未找到任何账目。', empty_state_get_started: '点击“新账目”开始。',
        action_title_edit: '编辑', action_title_mark_paid: '标记为已付', action_title_delete: '删除', action_title_approve: '批准', action_title_reject: '拒绝', action_title_reconcile: '标记为已对账',
        status_pending: '待处理', status_overdue: '逾期', status_paid: '已支付',
        approval_status_pending: '待审批', approval_status_approved: '已批准', approval_status_rejected: '已拒绝',
        analysis_chart_title_by_category: '按类别划分的费用', analysis_chart_title_top_suppliers: '前5名供应商', analysis_chart_title_monthly_payments: '月度付款（最近12个月）', analysis_chart_title_monthly_extra_costs: '每月额外费用（最近12个月）',
        chart_empty_state: '无数据显示。', chart_label_total_value_paid: '已付总额', chart_legend_paid: '已付', chart_legend_pending: '待付',
        grouped_view_total_cost: '总成本',
        bl_empty_state: '未找到与提单相关的成本。', po_empty_state: '未找到与采购订单相关的成本。', di_empty_state: '未找到与进口报关单相关的成本。',
        fup_title: 'FUP报告 - 按操作合并成本', fup_export_xlsx: '导出XLSX', fup_description: '此报告按提单和采购订单对所有成本进行合并。在“账目”选项卡中应用的日期筛选器也适用于此。', fup_empty_state: '未找到生成报告的操作数据。', fup_empty_state_hint: '确保账目已填写提单和采购订单字段。',
        cp_modal_title_new: '新AP账目', cp_modal_title_edit: '编辑AP账目', form_label_supplier: '供应商', form_label_category_expense: '类别/费用', form_section_operation_data: '操作数据', form_label_cost_center: '成本中心', form_label_cargo: '货物', form_placeholder_cargo: '例如：车辆', form_label_di_date: '进口报关日期', form_label_sap_po: 'SAP采购订单号', form_placeholder_sap_po: '例如：4500...',
        form_section_sap_docs: '参考文件 (SAP)', form_label_nf_number: '发票号', form_label_migo_number: 'MIGO号', form_label_miro_number: 'MIRO号',
        form_label_due_date: '到期日', form_label_payment_term: '付款条件', form_placeholder_payment_term: '例如：30天', form_label_currency: '货币', form_label_value: '金额', form_label_status: '状态', form_label_observations: '备注', form_placeholder_observations: '关于此账目的附加信息...',
        form_placeholder_select_category: '选择一个类别...',
        form_placeholder_select_supplier: '选择一个供应商...',
        button_cancel: '取消', button_save: '保存', button_close: '关闭', button_send: '发送',
        suppliers_modal_title: '供应商注册', form_placeholder_supplier_name: '供应商名称',
        categories_modal_title: '类别注册', form_placeholder_category_group: '类别组（例如：固定成本）', form_placeholder_category_name: '类别名称', form_label_category_type: '类型', category_type_revenue: '收入', category_type_expense: '支出', button_add_category: '添加类别',
        category_international: '国际成本', category_government_taxes: '政府税收', category_government_fees: '政府规费', category_customs_broker: '报关行', category_storage: '仓储成本', category_transport: '运输成本', category_destination: '目的地成本', category_extra: '额外成本', category_other: '其他',
        settings_modal_title: '通知设置', settings_enable_email: '启用电子邮件通知', settings_notify_days: '提前通知天数', settings_email_for_notifications: '用于通知的电子邮件', settings_email_placeholder: 'your.email@example.com',
        toast_supplier_updated: '供应商更新成功！', toast_supplier_added: '供应商添加成功！', toast_supplier_deleted: '供应商已删除。', toast_category_updated: '类别更新成功！', toast_category_added: '类别添加成功！', toast_category_deleted: '类别已删除。',
        toast_entry_updated: '账目更新成功！', toast_entry_saved: '账目保存成功！', toast_entry_paid: '账目标记为已付！', toast_entry_deleted: '账目已删除。', toast_entry_approved: '账目已批准！', toast_entry_rejected: '账目已拒绝！', toast_entry_reconciled: '预付款已对账！',
        toast_settings_saved: '设置保存成功！', toast_no_data_to_export: '无数据可导出。', toast_report_exported: '报告导出成功！', toast_action_not_allowed: '此用户不允许该操作。',
        password_modal_title: '需要确认', password_modal_text: '要继续，请输入密码以确认此操作。', password_modal_label: '密码', password_modal_placeholder: '********', password_modal_confirm_action_button: '确认操作', password_modal_error: '密码错误。请重试。',
        confirm_delete_supplier: '您确定要删除此供应商吗？此操作无法撤销。',
        confirm_delete_category: '您确定要删除此类别吗？',
        ai_modal_title: 'AP助手', ai_welcome_message: '你好！我是你的应付账款助手。可以问我关于你的账目的问题。例如：“应付给马士基航运的总额是多少？”', ai_input_placeholder: '问一个问题...', ai_error_generic: '抱歉，我无法处理您的请求。', ai_system_instruction: "你是一家使用SAP公司的应付账款专家财务助理。根据提供的JSON数据回答问题。数据包含'suppliers'（供应商），'categories'（类别）和'accountsPayable'（应付账款）。'migo'是收货，'miro'是发票收据。回答要简洁直接。将货币价值格式化为 ¥1,234.56。用中文回答。",
        form_label_di_number: '进口报关单号', form_label_vessel_name: '船名', form_label_voyage: '航次', form_label_nf_type: '发票类型', form_label_nf_emission_date: '发票开具日期', form_label_pr_number: '采购申请号', form_label_pr_emission_date: '采购申请开具日期', form_label_sap_po_emission_date: 'SAP采购订单开具日期', form_label_nf_import_number: '进口发票号', form_label_payment_method: '付款方式', form_label_payment_date: '付款日期', form_label_cfop: 'CFOP', form_label_is_adiantamento: '预付款？',
        database_title: '数据库 - FUP', database_upload_prompt: '点击上传FUP文件 (.xlsx)', database_table_header_bl: '提单/空运单', database_table_header_po: 'SAP采购订单', database_table_header_vessel: '船只', database_table_header_voyage: '航次', database_table_header_di: '进口报关单号', database_table_header_eta: '预计到达时间', database_empty_state: '未加载FUP数据。', toast_fup_loaded: 'FUP数据加载成功！', toast_fup_error: '加载FUP文件时出错。',
        conciliation_title: '预付款对账', conciliation_empty_state: '未找到预付款。', conciliation_empty_state_filtered: '按筛选器未找到待处理的预付款。', conciliation_filter_pending_only: '仅显示待处理', table_header_reconciliation_status: '对账状态', reconciliation_status_pending: '待处理', reconciliation_status_reconciled: '已对账',
        filter_db_placeholder: '按提单/空运单、SAP采购订单、船只或进口报关单号搜索...',
        filter_bl_placeholder: '按提单搜索...',
        filter_po_placeholder: '按采购订单搜索...',
        filter_di_placeholder: '按进口报关单号搜索...',
        upload_history_button: '上传历史记录',
        download_template_button: '下载模板',
        toast_history_loaded: '历史记录导入成功！',
        toast_history_error: '导入历史记录时出错。请检查文件格式。',
        cash_flow_title: '现金流', cash_flow_period_label: '期间:', cash_flow_period_this_month: '本月', cash_flow_period_next_30: '未来30天', cash_flow_period_this_quarter: '本季度', cash_flow_new_entry_button: '新流入/流出', cash_flow_kpi_opening_balance: '期初余额', cash_flow_kpi_inflows: '流入', cash_flow_kpi_outflows: '流出', cash_flow_kpi_closing_balance: '期末余额', cash_flow_chart_title: '每日现金头寸（预计与实际）', cash_flow_table_title: '现金流动', cash_flow_table_header_date: '日期', cash_flow_table_header_description: '描述', cash_flow_table_header_type: '类型', cash_flow_table_header_estimated: '预计金额', cash_flow_table_header_realized: '实际金额', cash_flow_table_header_status: '状态', cash_flow_table_empty: '该期间无流动。', cash_entry_modal_title: '新现金账目', cash_entry_label_description: '描述', cash_entry_label_type: '类型', cash_entry_label_value: '金额 (BRL)', cash_entry_label_estimated_date: '预计日期', cash_entry_label_realized_date: '实际日期', cash_entry_type_inflow: '流入', cash_entry_type_outflow: '流出', toast_cash_entry_saved: '现金账目已保存！',
        budget_control_title: '预算控制（预算与实际）', budget_set_button: '设置预算', budget_modal_title: '设置预算于', table_header_budgeted: '预算', table_header_actual: '实际', table_header_variance: '差异', total_revenues: '总收入', total_expenses: '总支出', net_result: '净结果', toast_budget_saved: '预算保存成功！', budget_empty_state: '所选期间无预算数据。', budget_empty_state_hint: '点击“设置预算”开始。',
        cash_flow_table_header_reference: '参考', cash_entry_label_reference: '参考 (提单/采购订单/进口报关单)', cash_entry_placeholder_reference: '例如：PO-12345',
        form_label_number_of_cars: '汽车数量', form_label_unique_di: '唯一进口报关单', option_yes: '是', option_no: '否',
        expand_all: '全部展开', collapse_all: '全部折叠',
        delete_all_entries_button: '清空所有账目',
        confirm_delete_all_entries: '您确定要删除所有账目吗？此操作不可逆，将永久删除所有应付账款数据。',
        toast_all_entries_deleted: '所有账目已成功删除！',
        export_excel_button: '导出Excel',
    },
};

type TranslationKeys = keyof typeof translations['pt-BR'];


// --- Application State ---
let state: {
    fornecedores: Fornecedor[];
    categorias: Categoria[];
    contasPagar: ContaPagar[];
    orcamentos: Orcamento[];
    cashEntries: CashEntry[];
    fupDatabase: FupData[];
    notificationSettings: NotificationSettings;
    currentUser: any; // Firebase User object
    currentLanguage: Language;
    activeFilters: {
        search: string;
        status: string;
        dateStart: string;
        dateEnd: string;
    };
    activeStatFilter: string | null;
    unsubscribeListeners: (() => void)[];
} = {
    fornecedores: [],
    categorias: [],
    contasPagar: [],
    orcamentos: [],
    cashEntries: [],
    fupDatabase: [],
    notificationSettings: { enabled: false, leadTimeDays: 3, email: '' },
    currentUser: null,
    currentLanguage: 'pt-BR',
    activeFilters: { search: '', status: 'all', dateStart: '', dateEnd: '' },
    activeStatFilter: null,
    unsubscribeListeners: [],
};

// --- Chart instances ---
// FIX: Changed type 'Chart' to 'any' to resolve typing error with global declaration.
let categoryPieChart: any | null = null;
let topSuppliersBarChart: any | null = null;
let monthlyPaymentsColumnChart: any | null = null;
let extraCostsMonthlyChart: any | null = null;
let cashFlowChart: any | null = null;


// --- Utility Functions ---

const translate = (key: TranslationKeys, lang: Language = state.currentLanguage): string => {
    return translations[lang]?.[key] || translations['pt-BR'][key] || key;
};

const formatCurrency = (value: number, currency: Currency = 'BRL', lang: Language = state.currentLanguage): string => {
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currency || 'BRL',
        minimumFractionDigits: 2,
    };
     // For Chinese, use a specific locale that matches the currency formatting standard
    const locale = lang === 'zh-CN' ? 'zh-Hans-CN' : lang;
    return new Intl.NumberFormat(locale, options).format(value);
};

const formatDate = (dateString: string, lang: Language = state.currentLanguage, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString + 'T00:00:00'); // Assume local timezone
        if (isNaN(date.getTime())) return 'Invalid Date';
        return new Intl.DateTimeFormat(lang, options).format(date);
    } catch (e) {
        return 'Invalid Date';
    }
};


const showToast = (messageKey: TranslationKeys | string, type: 'success' | 'error' = 'success') => {
    const toast = document.getElementById('toast')!;
    const toastMessage = document.getElementById('toast-message')!;
    
    // Check if the messageKey is a key in our translations, otherwise use it directly
    const message = translate(messageKey as TranslationKeys);

    toastMessage.textContent = message;
    toast.className = 'fixed bottom-8 right-8 text-white py-3 px-6 rounded-lg shadow-lg transform transition-all duration-300 z-50'; // Reset classes
    
    if (type === 'success') {
        toast.classList.add('bg-green-500');
    } else {
        toast.classList.add('bg-red-500');
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
};

function debounce(func: (...args: any[]) => void, delay: number) {
    let timeout: number;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), delay);
    };
}


// --- Gemini AI Configuration ---
let ai: GoogleGenAI;
try {
    // FIX: Use the recommended Gemini API initialization.
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
} catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    showToast("Error initializing AI Assistant. API Key might be missing.", 'error');
}


// --- Modal Management ---
let passwordResolve: ((password: string) => void) | null = null;
let passwordReject: (() => void) | null = null;

function openModal(modalId: string) {
    const modal = document.getElementById(modalId);
    if (modal) {
        (modal as any).style.display = 'flex';
    }
}

function closeModal(modalId: string) {
    const modal = document.getElementById(modalId);
    if (modal) {
        (modal as any).style.display = 'none';
        // Reset forms inside the modal
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
        if (modalId === 'modal-cp') {
            document.getElementById('cp-id')!.removeAttribute('value');
             document.getElementById('cp-number-display')!.classList.add('hidden');
             (document.getElementById('payment-date-wrapper') as HTMLElement).classList.add('hidden');
        }
        if (modalId === 'modal-password-confirm' && passwordReject) {
            passwordReject(); // Reject the promise if the modal is closed without confirmation
            passwordResolve = null;
            passwordReject = null;
        }
    }
}

function openNewCpModal() {
    const form = document.getElementById('form-cp') as HTMLFormElement;
    form.reset();
    
    (document.getElementById('cp-id') as HTMLInputElement).value = '';
    const cpNumberDisplay = document.getElementById('cp-number-display') as HTMLElement;
    cpNumberDisplay.classList.add('hidden');
    cpNumberDisplay.textContent = '';
    
    (document.getElementById('cp-modal-title') as HTMLElement).textContent = translate('cp_modal_title_new');
    
    (document.getElementById('payment-date-wrapper') as HTMLElement).classList.add('hidden');

    openModal('modal-cp');
}


// --- Data Fetching and Persistence (Firestore) ---

function listenToData() {
    if (!state.currentUser) return;
    const userId = state.currentUser.uid;

    state.unsubscribeListeners.forEach(unsub => unsub());
    state.unsubscribeListeners = [];

    const collectionsToListen = {
        'fornecedores': 'fornecedores',
        'categorias': 'categorias',
        'contasPagar': 'contasPagar',
        'orcamentos': 'orcamentos',
        'cashEntries': 'cashEntries',
        'fupDatabase': 'fupDatabase'
    };

    for (const [stateKey, collectionName] of Object.entries(collectionsToListen)) {
        const q = db.collection('users').doc(SHARED_DATA_OWNER_UID).collection(collectionName);
        const unsubscribe = q.onSnapshot((snapshot: any) => {
            const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            (state as any)[stateKey] = data;

            if (stateKey === 'categorias' && data.length === 0) {
               seedInitialData();
            }
            
            // FIX: Call updateUI function, which was previously undefined.
            updateUI();
        }, (error: Error) => {
            console.error(`Error in snapshot listener for ${collectionName}:`, error.message);
        });
        state.unsubscribeListeners.push(unsubscribe);
    }
    
    const settingsDocRef = db.collection('settings').doc(userId);
    const unsubSettings = settingsDocRef.onSnapshot(async (doc: any) => {
        if (doc.exists) {
            const settingsData = doc.data();
            state.notificationSettings = { ...state.notificationSettings, ...settingsData };
            if (settingsData.language && translations[settingsData.language]) {
                state.currentLanguage = settingsData.language;
                // FIX: Call setCurrentLanguage function, which was previously undefined.
                setCurrentLanguage(state.currentLanguage, false); // Don't save back to DB
            }
        } else {
            const defaultSettings = { 
                enabled: false, 
                leadTimeDays: 3, 
                email: state.currentUser.email || '',
                language: 'pt-BR'
            };
            await settingsDocRef.set(defaultSettings);
        }
    }, (error: Error) => {
        console.error('Error in settings snapshot listener:', error.message);
    });
    state.unsubscribeListeners.push(unsubSettings);
}


// Seeding initial data for categories for a better first-time experience
const initialCategorias: Omit<Categoria, 'id'>[] = [
    { group: 'Custos Internacionais', name: 'Freight', type: 'Despesa' },
    { group: 'Custos Internacionais', name: 'Insurance', type: 'Despesa' },
    { group: 'Impostos Governamentais', name: 'II', type: 'Despesa' },
    { group: 'Impostos Governamentais', name: 'IPI', type: 'Despesa' },
    { group: 'Impostos Governamentais', name: 'PIS', type: 'Despesa' },
    { group: 'Impostos Governamentais', name: 'COFINS', type: 'Despesa' },
    { group: 'Impostos Governamentais', name: 'ICMS', type: 'Despesa' },
    { group: 'Taxas Governamentais', name: 'Antidumping', type: 'Despesa' },
    { group: 'Taxas Governamentais', name: 'Siscomex', type: 'Despesa' },
    { group: 'Taxas Governamentais', name: 'AFRMM', type: 'Despesa' },
    { group: 'Despachante Aduaneiro', name: 'Clearance Service', type: 'Despesa' },
    { group: 'Despachante Aduaneiro', name: 'Monitoring', type: 'Despesa' },
    { group: 'Despachante Aduaneiro', name: 'SDA', type: 'Despesa' },
    { group: 'Despachante Aduaneiro', name: 'ICMS Service', type: 'Despesa' },
    { group: 'Despachante Aduaneiro', name: 'NF Issue', type: 'Despesa' },
    { group: 'Custos de Armazenagem', name: 'Transport Port x Intermarítima', type: 'Despesa' },
    { group: 'Custos de Armazenagem', name: 'Handling', type: 'Despesa' },
    { group: 'Custos de Armazenagem', name: 'Loose Cargo Handling', type: 'Despesa' },
    { group: 'Custos de Armazenagem', name: 'Scanner', type: 'Despesa' },
    { group: 'Custos de Armazenagem', name: 'Cargo Presence', type: 'Despesa' },
    { group: 'Custos de Armazenagem', name: '1st Period Storage', type: 'Despesa' },
    { group: 'Custos de Armazenagem', name: 'GRIS', type: 'Despesa' },
    { group: 'Custos de Armazenagem', name: 'Container Return', type: 'Despesa' },
    { group: 'Custos de Transporte', name: 'Transport', type: 'Despesa' },
    { group: 'Custos de Destino', name: 'THC', type: 'Despesa' },
    { group: 'Custos de Destino', name: 'Discharge Fee', type: 'Despesa' },
    { group: 'Custos de Destino', name: 'ISPS', type: 'Despesa' },
    { group: 'Custos de Destino', name: 'BL Fee', type: 'Despesa' },
    { group: 'Custos de Destino', name: 'Drop Off', type: 'Despesa' },
    { group: 'Custos de Destino', name: 'Damage Protection', type: 'Despesa' },
    { group: 'Custos de Destino', name: 'Other Expenses', type: 'Despesa' },
    { group: 'Custos Extras', name: '2nd Period Storage', type: 'Despesa' },
    { group: 'Custos Extras', name: '3rd Period Storage', type: 'Despesa' },
    { group: 'Custos Extras', name: '4th Period Storage', type: 'Despesa' },
    { group: 'Custos Extras', name: '5th Period Storage', type: 'Despesa' },
    { group: 'Custos Extras', name: 'Mechanized Container Unloading', type: 'Despesa' },
    { group: 'Custos Extras', name: 'Extra Handling', type: 'Despesa' },
    { group: 'Custos Extras', name: 'Container/Loose Cargo Positioning', type: 'Despesa' },
    { group: 'Custos Extras', name: 'Weighting', type: 'Despesa' },
    { group: 'Custos Extras', name: 'Container Washing', type: 'Despesa' },
    { group: 'Custos Extras', name: 'Tarping', type: 'Despesa' },
    { group: 'Custos Extras', name: 'Extra GRIS', type: 'Despesa' },
    { group: 'Custos Extras', name: 'Others', type: 'Despesa' },
    { group: 'Outros', name: 'Demurage', type: 'Despesa' },
    { group: 'Outros', name: 'Document Fee', type: 'Despesa' },
    { group: 'Outros', name: 'Extra Container Return', type: 'Despesa' },
    { group: 'Receitas', name: 'Venda de Veículos', type: 'Receita' },
    { group: 'Receitas', name: 'Venda de Peças', type: 'Receita' },
];

async function seedInitialData() {
    if (!state.currentUser) return;
    const batch = db.batch();
    
    const userCategoriesCollection = db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('categorias');
    initialCategorias.forEach(cat => {
        const newCatRef = userCategoriesCollection.doc();
        batch.set(newCatRef, { ...cat });
    });
    
    await batch.commit();
}

// FIX: Define the missing setCurrentLanguage function.
// It updates the application's language, saves the preference, and triggers a full UI refresh.
async function setCurrentLanguage(lang: Language, saveToDb = true) {
    if (!translations[lang]) {
        console.warn(`Language "${lang}" not found.`);
        return;
    }
    state.currentLanguage = lang;
    document.documentElement.lang = lang.split('-')[0];

    const flags: Record<Language, string> = {
        'pt-BR': 'https://flagcdn.com/br.svg',
        'en': 'https://flagcdn.com/gb.svg',
        'zh-CN': 'https://flagcdn.com/cn.svg'
    };
    (document.getElementById('current-lang-flag') as HTMLImageElement).src = flags[lang];
    (document.getElementById('current-lang-text') as HTMLElement).textContent = lang.toUpperCase();


    if (saveToDb && state.currentUser) {
        try {
            await db.collection('settings').doc(state.currentUser.uid).set({ language: lang }, { merge: true });
        } catch (error) {
            console.error("Error saving language setting:", error);
            // Optionally show a toast to the user
        }
    }

    // Re-render the entire UI to apply the new language
    updateUI();
}

// FIX: Define helper functions required by updateUI.
function populateSupplierOptions() {
    const supplierSelect = document.getElementById('cp-fornecedor') as HTMLSelectElement;
    if (!supplierSelect) return;

    const currentVal = supplierSelect.value;
    supplierSelect.innerHTML = `<option value="">${translate('form_placeholder_select_supplier')}</option>`;
    state.fornecedores
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(f => {
            const option = document.createElement('option');
            option.value = f.id;
            option.textContent = f.name;
            supplierSelect.appendChild(option);
        });
    supplierSelect.value = currentVal;
}

function populateCategoryOptions() {
    const selects = document.querySelectorAll('.category-select-list') as NodeListOf<HTMLSelectElement>;
    if (selects.length === 0) return;

    const groupedReceitas = state.categorias.reduce((acc, cat) => {
        if(cat.type === 'Receita') {
            if (!acc[cat.group]) acc[cat.group] = [];
            acc[cat.group].push(cat);
        }
        return acc;
    }, {} as Record<string, Categoria[]>);

    const groupedDespesas = state.categorias.reduce((acc, cat) => {
        if(cat.type === 'Despesa') {
            if (!acc[cat.group]) acc[cat.group] = [];
            acc[cat.group].push(cat);
        }
        return acc;
    }, {} as Record<string, Categoria[]>);

    selects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = `<option value="">${translate('form_placeholder_select_category')}</option>`;
        
        const optgroupReceitas = document.createElement('optgroup');
        optgroupReceitas.label = translate('category_type_revenue');
        Object.keys(groupedReceitas).sort().forEach(groupName => {
            groupedReceitas[groupName].sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
                 const option = document.createElement('option');
                option.value = c.id;
                option.textContent = `${groupName} > ${c.name}`;
                optgroupReceitas.appendChild(option);
            });
        });
        if(optgroupReceitas.hasChildNodes()) select.appendChild(optgroupReceitas);

        const optgroupDespesas = document.createElement('optgroup');
        optgroupDespesas.label = translate('category_type_expense');
        Object.keys(groupedDespesas).sort().forEach(groupName => {
            groupedDespesas[groupName].sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
                 const option = document.createElement('option');
                option.value = c.id;
                option.textContent = `${groupName} > ${c.name}`;
                optgroupDespesas.appendChild(option);
            });
        });
        if(optgroupDespesas.hasChildNodes()) select.appendChild(optgroupDespesas);

        select.value = currentVal;
    });
}

function renderStats() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const totalPayable = state.contasPagar
        .filter(cp => cp.status === 'Pendente')
        .reduce((sum, cp) => sum + cp.valor, 0);

    const dueToday = state.contasPagar
        .filter(cp => cp.status === 'Pendente' && cp.vencimento === today)
        .reduce((sum, cp) => sum + cp.valor, 0);

    const overdue = state.contasPagar
        .filter(cp => cp.status === 'Pendente' && cp.vencimento < today)
        .reduce((sum, cp) => sum + cp.valor, 0);

    const paidInMonth = state.contasPagar
        .filter(cp => cp.status === 'Pago' && cp.paymentDate && cp.paymentDate >= firstDayOfMonth && cp.paymentDate <= lastDayOfMonth)
        .reduce((sum, cp) => sum + cp.valor, 0);
    
    const container = document.getElementById('dashboard-stats');
    if(!container) return;

    container.innerHTML = `
        <div class="stat-card bg-slate-800 p-6 rounded-xl flex items-center gap-6" data-stat-filter="total">
            <div class="bg-blue-500/20 text-blue-400 h-12 w-12 flex items-center justify-center rounded-lg"><i class="fas fa-file-invoice-dollar text-xl"></i></div>
            <div><p class="text-sm text-slate-400" data-translate="stat_total_payable">${translate('stat_total_payable')}</p><p id="stat-total-payable-value" class="text-2xl font-bold text-slate-100">${formatCurrency(totalPayable)}</p></div>
        </div>
        <div class="stat-card bg-slate-800 p-6 rounded-xl flex items-center gap-6" data-stat-filter="today">
            <div class="bg-yellow-500/20 text-yellow-400 h-12 w-12 flex items-center justify-center rounded-lg"><i class="fas fa-calendar-day text-xl"></i></div>
            <div><p class="text-sm text-slate-400" data-translate="stat_due_today">${translate('stat_due_today')}</p><p id="stat-due-today-value" class="text-2xl font-bold text-slate-100">${formatCurrency(dueToday)}</p></div>
        </div>
        <div class="stat-card bg-slate-800 p-6 rounded-xl flex items-center gap-6" data-stat-filter="overdue">
            <div class="bg-red-500/20 text-red-400 h-12 w-12 flex items-center justify-center rounded-lg"><i class="fas fa-exclamation-triangle text-xl"></i></div>
            <div><p class="text-sm text-slate-400" data-translate="stat_overdue">${translate('stat_overdue')}</p><p id="stat-overdue-value" class="text-2xl font-bold text-slate-100">${formatCurrency(overdue)}</p></div>
        </div>
        <div class="stat-card bg-slate-800 p-6 rounded-xl flex items-center gap-6" data-stat-filter="paid">
            <div class="bg-green-500/20 text-green-400 h-12 w-12 flex items-center justify-center rounded-lg"><i class="fas fa-check-circle text-xl"></i></div>
            <div><p class="text-sm text-slate-400" data-translate="stat_paid_in_month">${translate('stat_paid_in_month')}</p><p id="stat-paid-in-month-value" class="text-2xl font-bold text-slate-100">${formatCurrency(paidInMonth)}</p></div>
        </div>
    `;
    
    // Re-apply active class if a filter is set
    if(state.activeStatFilter) {
        container.querySelector(`[data-stat-filter="${state.activeStatFilter}"]`)?.classList.add('active');
    }
}

function renderContasPagarTable(data: ContaPagar[]) {
    const tableBody = document.getElementById('cp-table-body') as HTMLTableSectionElement;
    const emptyState = document.getElementById('lancamentos-empty-state') as HTMLElement;
    if (!tableBody || !emptyState) return;

    if (data.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        const p = emptyState.querySelector('p') as HTMLElement;
        const hasFilters = state.activeFilters.search || state.activeFilters.status !== 'all' || state.activeFilters.dateStart || state.activeFilters.dateEnd || state.activeStatFilter;
        if(p) p.textContent = translate(hasFilters ? 'empty_state_no_entries_filtered' : 'empty_state_no_entries');
        return;
    }

    emptyState.style.display = 'none';
    tableBody.innerHTML = data.map(cp => {
        const fornecedor = state.fornecedores.find(f => f.id === cp.fornecedorId)?.name || 'N/A';
        const categoria = state.categorias.find(c => c.id === cp.categoriaId)?.name || 'N/A';
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = cp.vencimento < today && cp.status === 'Pendente';
        const isUserAdmin = state.currentUser && ADMIN_UIDS.includes(state.currentUser.uid);

        let statusBadge = '';
        let statusText = '';
        if (cp.status === 'Pago') {
            statusBadge = 'bg-green-500/20 text-green-400';
            statusText = translate('status_paid');
        } else if (isOverdue) {
            statusBadge = 'bg-red-500/20 text-red-400';
            statusText = translate('status_overdue');
        } else {
            statusBadge = 'bg-yellow-500/20 text-yellow-400';
            statusText = translate('status_pending');
        }
        
        let approvalBadge = '';
        let approvalText = '';
        switch(cp.approvalStatus) {
            case 'Aprovado':
                approvalBadge = 'bg-green-500/20 text-green-400';
                approvalText = translate('approval_status_approved');
                break;
            case 'Rejeitado':
                approvalBadge = 'bg-red-500/20 text-red-400';
                approvalText = translate('approval_status_rejected');
                break;
            default:
                approvalBadge = 'bg-yellow-500/20 text-yellow-400';
                approvalText = translate('approval_status_pending');
        }
        
        const canApprove = isUserAdmin && cp.approvalStatus !== 'Aprovado';
        const canReject = isUserAdmin && cp.approvalStatus !== 'Rejeitado';

        return `
            <tr class="hover:bg-slate-700/50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">${cp.cpNumber || ''}</td>
                 <td class="px-6 py-4 whitespace-nowrap"><span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${approvalBadge}">${approvalText}</span></td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge}">${statusText}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${formatDate(cp.vencimento)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">${cp.paymentTerm || ''}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${fornecedor}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">${categoria}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-teal-400 font-mono">${formatCurrency(cp.valorOriginal, cp.currency)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                    ${cp.bl ? `<div class="font-semibold text-slate-300">BL: ${cp.bl}</div>` : ''}
                    ${cp.po ? `<div>PO: ${cp.po}</div>` : ''}
                    ${cp.nf ? `<div>NF: ${cp.nf}</div>` : ''}
                </td>
                 <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">${cp.voyage || ''}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div class="flex items-center justify-center gap-3">
                        ${canApprove ? `<button data-id="${cp.id}" class="action-btn approve-cp text-slate-400 hover:text-green-400" title="${translate('action_title_approve')}"><i class="fas fa-check-circle fa-fw text-lg"></i></button>` : ''}
                        ${canReject ? `<button data-id="${cp.id}" class="action-btn reject-cp text-slate-400 hover:text-orange-400" title="${translate('action_title_reject')}"><i class="fas fa-times-circle fa-fw text-lg"></i></button>` : ''}
                        <button data-id="${cp.id}" class="action-btn edit-cp text-slate-400 hover:text-sky-400" title="${translate('action_title_edit')}"><i class="fas fa-pencil-alt fa-fw"></i></button>
                        ${cp.status !== 'Pago' ? `<button data-id="${cp.id}" class="action-btn mark-paid-cp text-slate-400 hover:text-teal-400" title="${translate('action_title_mark_paid')}"><i class="fas fa-cash-register fa-fw"></i></button>` : ''}
                        ${isUserAdmin ? `<button data-id="${cp.id}" class="action-btn delete-cp text-slate-400 hover:text-red-400" title="${translate('action_title_delete')}"><i class="fas fa-trash-alt fa-fw"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}


// FIX: Define the main UI update function, which was previously missing.
// This function orchestrates the re-rendering of all dynamic parts of the application.
function updateUI() {
    if (!state.currentUser) return;

    // Translate static elements before rendering dynamic content
    document.querySelectorAll<HTMLElement>('[data-translate]').forEach(el => {
        const key = el.dataset.translate as TranslationKeys;
        if (key) {
            if (el.hasAttribute('data-translate-placeholder')) {
                 el.setAttribute('placeholder', translate(key));
            } else {
                el.textContent = translate(key);
            }
        }
    });

    populateSupplierOptions();
    populateCategoryOptions();
    renderStats();

    const filteredData = getFilteredData();
    renderContasPagarTable(filteredData);
    
    // The render functions for other views have internal checks and can be called safely.
    renderBlView((document.getElementById('bl-filter-input') as HTMLInputElement)?.value);
    renderPoView((document.getElementById('po-filter-input') as HTMLInputElement)?.value);
    renderDiView((document.getElementById('di-filter-input') as HTMLInputElement)?.value);
    renderFupReportView();
    renderFupDatabaseView((document.getElementById('fup-database-search') as HTMLInputElement)?.value);
    renderConciliacaoView();
    renderAnaliseView();
    renderFluxoCaixaView();
    renderBudgetControlView();
}


function getFilteredData(): ContaPagar[] {
    const { search, status, dateStart, dateEnd } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    let filtered = state.contasPagar;

    // 1. Stat Card Filters (highest priority)
    if (state.activeStatFilter) {
        // We will filter the already filtered list unless it's the 'paid' filter
        if (state.activeStatFilter === 'paid') {
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            return state.contasPagar.filter(cp => 
                cp.status === 'Pago' && 
                cp.paymentDate && 
                cp.paymentDate >= firstDayOfMonth && 
                cp.paymentDate <= lastDayOfMonth
            ).sort((a, b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime());
        }
        
        switch (state.activeStatFilter) {
            case 'total':
                filtered = filtered.filter(cp => cp.status === 'Pendente');
                break;
            case 'today':
                filtered = filtered.filter(cp => cp.vencimento === today && cp.status === 'Pendente');
                break;
            case 'overdue':
                filtered = filtered.filter(cp => cp.vencimento < today && cp.status === 'Pendente');
                break;
        }
    }


    // 2. Main Filter Bar
    // Status filter
    if (status !== 'all') {
        if (status === 'Atrasado') {
            filtered = filtered.filter(cp => cp.vencimento < today && cp.status === 'Pendente');
        } else {
             filtered = filtered.filter(cp => cp.status === status);
        }
    }

    // Date range filter
    if (dateStart) {
        filtered = filtered.filter(cp => cp.vencimento >= dateStart);
    }
    if (dateEnd) {
        filtered = filtered.filter(cp => cp.vencimento <= dateEnd);
    }

    // Search filter
    if (lowerCaseSearch) {
        filtered = filtered.filter(cp => {
            const fornecedor = state.fornecedores.find(f => f.id === cp.fornecedorId);
            return (
                cp.cpNumber?.toLowerCase().includes(lowerCaseSearch) ||
                fornecedor?.name.toLowerCase().includes(lowerCaseSearch) ||
                cp.migo?.toLowerCase().includes(lowerCaseSearch) ||
                cp.miro?.toLowerCase().includes(lowerCaseSearch) ||
                cp.bl?.toLowerCase().includes(lowerCaseSearch) ||
                cp.po?.toLowerCase().includes(lowerCaseSearch) ||
                cp.nf?.toLowerCase().includes(lowerCaseSearch)
            );
        });
    }

    // Sort by due date, most recent first
    return filtered.sort((a, b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime());
}

function renderGroupedView(
    groupByKey: 'bl' | 'po' | 'diNumber',
    listElementId: string,
    emptyStateElementId: string,
    filter?: string
) {
    const listElement = document.getElementById(listElementId)!;
    const emptyStateElement = document.getElementById(emptyStateElementId)!;
    const keyLabel = groupByKey === 'diNumber' ? 'DI' : groupByKey.toUpperCase();

    const groupedData = state.contasPagar.reduce((acc, cp) => {
        let keySource: any;
        if (groupByKey === 'po') {
            // Prioritize sapPo if it exists and is not empty, otherwise fallback to po
            keySource = (cp.sapPo && String(cp.sapPo).trim() !== '') ? cp.sapPo : cp.po;
        } else {
            keySource = cp[groupByKey];
        }

        if (keySource != null) {
            const key = String(keySource).trim();
            if (key) { // Check if not empty after trim
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(cp);
            }
        }
        return acc;
    }, {} as Record<string, ContaPagar[]>);

    let filteredKeys = Object.keys(groupedData);
    if (filter && filter.trim() !== '') {
        const lowerCaseFilter = filter.toLowerCase();
        filteredKeys = filteredKeys.filter(key => key.toLowerCase().includes(lowerCaseFilter));
    }

    if (filteredKeys.length === 0) {
        listElement.innerHTML = '';
        emptyStateElement.style.display = 'block';
        listElement.style.display = 'none';
        return;
    }

    emptyStateElement.style.display = 'none';
    listElement.style.display = 'block';

    const html = filteredKeys.sort().map(key => {
        const entries = groupedData[key];
        const totalValue = entries.reduce((sum, cp) => sum + cp.valor, 0);

        const entriesHtml = entries.map(cp => {
            const categoria = state.categorias.find(c => c.id === cp.categoriaId)?.name || 'N/A';
            const fornecedor = state.fornecedores.find(f => f.id === cp.fornecedorId)?.name || 'N/A';
            
            const today = new Date().toISOString().split('T')[0];
            const isOverdue = cp.vencimento < today && cp.status === 'Pendente';
            let statusBadge = '';
            let statusText = '';
            if (cp.status === 'Pago') {
                statusBadge = 'bg-green-500/20 text-green-400';
                statusText = translate('status_paid');
            } else if (isOverdue) {
                statusBadge = 'bg-red-500/20 text-red-400';
                statusText = translate('status_overdue');
            } else {
                statusBadge = 'bg-yellow-500/20 text-yellow-400';
                statusText = translate('status_pending');
            }

            return `
                <tr class="hover:bg-slate-700/50">
                    <td class="px-4 py-2 whitespace-nowrap text-slate-300">${categoria}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-slate-300">${fornecedor}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-slate-400">${formatDate(cp.vencimento)}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-right font-medium text-slate-200">${formatCurrency(cp.valorOriginal, cp.currency)}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-center">
                        <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge}">${statusText}</span>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <details class="bg-slate-800 rounded-xl shadow-lg overflow-hidden" open>
                <summary class="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-700/50 transition-colors">
                    <div class="flex items-center gap-4">
                        <span class="font-bold text-lg text-slate-100">${keyLabel}: ${key}</span>
                        <span class="text-sm bg-slate-700 px-2 py-1 rounded-md">${entries.length} Lançamentos</span>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-sm text-slate-400" data-translate="grouped_view_total_cost">${translate('grouped_view_total_cost')}:</span>
                        <span class="font-bold text-xl text-teal-400">${formatCurrency(totalValue)}</span>
                        <i class="fas fa-chevron-right accordion-icon transition-transform duration-200"></i>
                    </div>
                </summary>
                <div class="p-4 border-t border-slate-700 bg-slate-800/50">
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm">
                            <thead class="bg-slate-900/50">
                                <tr>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">${translate('table_header_category')}</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">${translate('table_header_supplier')}</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">${translate('table_header_due_date')}</th>
                                    <th class="px-4 py-2 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">${translate('table_header_value')}</th>
                                    <th class="px-4 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">${translate('table_header_status')}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-700">
                                ${entriesHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </details>
        `;
    }).join('');

    listElement.innerHTML = html;
}

function renderBlView(filter?: string) {
    renderGroupedView('bl', 'bl-list', 'bl-empty-state', filter);
}
function renderPoView(filter?: string) {
    renderGroupedView('po', 'po-list', 'po-empty-state', filter);
}
function renderDiView(filter?: string) {
    renderGroupedView('diNumber', 'di-list', 'di-empty-state', filter);
}

function renderFupDatabaseView(filter?: string) {
    const tableBody = document.getElementById('fup-database-table-body')!;
    const emptyState = document.getElementById('fup-database-empty-state')!;

    const lowerCaseFilter = filter ? filter.toLowerCase() : '';

    const filteredData = state.fupDatabase.filter(row => {
        if (!lowerCaseFilter) return true;
        return Object.entries(row).some(([key, value]) => {
            if (key === 'id') return false;
            return String(value).toLowerCase().includes(lowerCaseFilter);
        });
    });

    if (filteredData.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        tableBody.innerHTML = filteredData.map(row => {
            const etaValue = row['ACTUAL ETA'];
            let formattedEta = 'N/A';
            if (etaValue) {
                const date = (etaValue.toDate) ? etaValue.toDate() : new Date(etaValue);
                if (!isNaN(date.getTime())) {
                     const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                    formattedEta = formatDate(utcDate.toISOString().split('T')[0]);
                } else {
                    formattedEta = String(etaValue);
                }
            }
            
            return `
                <tr class="hover:bg-slate-700/50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">${row['BL/AWB'] || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${row['PO SAP'] || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">${row['ARRIVAL VESSEL'] || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">${row['VOYAGE'] || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">${row['DI'] || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${formattedEta}</td>
                </tr>
            `;
        }).join('');
    }
}
function renderConciliacaoView() {
    const tableBody = document.getElementById('conciliacao-table-body')!;
    const emptyState = document.getElementById('conciliacao-empty-state')!;
    const showPendingOnly = (document.getElementById('conciliation-filter-toggle') as HTMLInputElement).checked;

    let adiantamentos = state.contasPagar.filter(cp => cp.isAdiantamento);

    if (showPendingOnly) {
        adiantamentos = adiantamentos.filter(cp => !cp.reconciled);
    }
    
    adiantamentos.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

    if (adiantamentos.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        (emptyState.querySelector('p') as HTMLElement).textContent = translate(showPendingOnly ? 'conciliation_empty_state_filtered' : 'conciliation_empty_state');
    } else {
        emptyState.style.display = 'none';
        tableBody.innerHTML = adiantamentos.map(cp => {
            const fornecedor = state.fornecedores.find(f => f.id === cp.fornecedorId)?.name || 'N/A';
            const isReconciled = cp.reconciled === true;

            const statusBadge = isReconciled 
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400';
            const statusText = isReconciled 
                ? translate('reconciliation_status_reconciled')
                : translate('reconciliation_status_pending');
            
            return `
                <tr class="hover:bg-slate-700/50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">${cp.cpNumber}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${fornecedor}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${formatDate(cp.vencimento)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-teal-400">${formatCurrency(cp.valor)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge}">${statusText}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button data-id="${cp.id}" class="action-btn toggle-reconciliation text-slate-400 hover:text-teal-400" title="${translate('action_title_reconcile')}">
                            <i class="fas ${isReconciled ? 'fa-times-circle' : 'fa-check-circle'} fa-fw text-lg"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}
function renderBudgetControlView() { /* Stub */ }

// --- Chart Rendering ---
function getDateRangeForCashFlow() {
    const period = (document.getElementById('cash-flow-period') as HTMLSelectElement).value;
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
        case 'next_30_days':
            startDate = new Date();
            endDate = new Date();
            endDate.setDate(now.getDate() + 30);
            break;
        case 'this_quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            break;
        case 'this_month':
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
}

function getCashFlowMovements() {
    const { startDate, endDate } = getDateRangeForCashFlow();

    // 1. Gather all movements within the date range
    const movements: {
        date: string; // YYYY-MM-DD
        description: string;
        type: 'Entrada' | 'Saída';
        estimatedValue: number;
        realizedValue: number;
        status: 'Estimado' | 'Realizado';
        reference: string;
    }[] = [];

    // From Contas a Pagar (always 'Saída')
    state.contasPagar.forEach(cp => {
        const dueDate = new Date(cp.vencimento + 'T00:00:00');
        const paymentDate = cp.paymentDate ? new Date(cp.paymentDate + 'T00:00:00') : null;

        const isPaidInRange = paymentDate && paymentDate >= startDate && paymentDate <= endDate;
        const isDueInRange = dueDate >= startDate && dueDate <= endDate;

        if (cp.status === 'Pago' && isPaidInRange) {
            movements.push({
                date: cp.paymentDate!,
                description: `Pagamento CP ${cp.cpNumber} - ${state.fornecedores.find(f => f.id === cp.fornecedorId)?.name || ''}`,
                type: 'Saída',
                estimatedValue: 0,
                realizedValue: cp.valor,
                status: 'Realizado',
                reference: cp.bl || cp.po || ''
            });
        } else if (cp.status === 'Pendente' && isDueInRange) {
             movements.push({
                date: cp.vencimento,
                description: `Vencimento CP ${cp.cpNumber} - ${state.fornecedores.find(f => f.id === cp.fornecedorId)?.name || ''}`,
                type: 'Saída',
                estimatedValue: cp.valor,
                realizedValue: 0,
                status: 'Estimado',
                reference: cp.bl || cp.po || ''
            });
        }
    });

    // From Cash Entries
    state.cashEntries.forEach(ce => {
        const estDate = new Date(ce.estimatedDate + 'T00:00:00');
        const realDate = ce.realizedDate ? new Date(ce.realizedDate + 'T00:00:00') : null;

        if (ce.realizedDate && realDate && realDate >= startDate && realDate <= endDate) {
             movements.push({
                date: ce.realizedDate,
                description: ce.description,
                type: ce.type,
                estimatedValue: 0,
                realizedValue: ce.value,
                status: 'Realizado',
                reference: ce.reference || ''
            });
        } else if (estDate >= startDate && estDate <= endDate) {
             movements.push({
                date: ce.estimatedDate,
                description: ce.description,
                type: ce.type,
                estimatedValue: ce.value,
                realizedValue: 0,
                status: 'Estimado',
                reference: ce.reference || ''
            });
        }
    });
    
    movements.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return movements;
}

function renderFluxoCaixaView() {
    if (!document.getElementById('view-fluxo-caixa')?.classList.contains('active')) {
        return;
    }

    const { startDate, endDate } = getDateRangeForCashFlow();
    const movements = getCashFlowMovements();

    // 2. Calculate KPIs for the period
    const openingBalance = 0; // Simplified
    const inflows = movements.filter(m => m.status === 'Realizado' && m.type === 'Entrada').reduce((sum, m) => sum + m.realizedValue, 0);
    const outflows = movements.filter(m => m.status === 'Realizado' && m.type === 'Saída').reduce((sum, m) => sum + m.realizedValue, 0);
    const closingBalance = openingBalance + inflows - outflows;

    (document.getElementById('cash-flow-kpis') as HTMLElement).innerHTML = `
        <div class="bg-slate-900/50 p-4 rounded-xl"><p class="text-sm text-slate-400" data-translate="cash_flow_kpi_opening_balance">${translate('cash_flow_kpi_opening_balance')}</p><p class="text-xl font-bold">${formatCurrency(openingBalance)}</p></div>
        <div class="bg-slate-900/50 p-4 rounded-xl"><p class="text-sm text-green-400" data-translate="cash_flow_kpi_inflows">${translate('cash_flow_kpi_inflows')}</p><p class="text-xl font-bold text-green-400">${formatCurrency(inflows)}</p></div>
        <div class="bg-slate-900/50 p-4 rounded-xl"><p class="text-sm text-red-400" data-translate="cash_flow_kpi_outflows">${translate('cash_flow_kpi_outflows')}</p><p class="text-xl font-bold text-red-400">${formatCurrency(Math.abs(outflows))}</p></div>
        <div class="bg-slate-900/50 p-4 rounded-xl"><p class="text-sm text-slate-400" data-translate="cash_flow_kpi_closing_balance">${translate('cash_flow_kpi_closing_balance')}</p><p class="text-xl font-bold">${formatCurrency(closingBalance)}</p></div>
    `;
    
    // 3. Render Table
    const tableBody = document.getElementById('cash-flow-table-body')!;
    const emptyState = document.getElementById('cash-flow-table-empty-state')!;
    
    if (movements.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        tableBody.innerHTML = movements.map(m => {
            const typeColor = m.type === 'Entrada' ? 'text-green-400' : 'text-red-400';
            const value = m.status === 'Estimado' ? m.estimatedValue : m.realizedValue;
            return `
                 <tr class="hover:bg-slate-700/50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">${formatDate(m.date)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">${m.description}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">${m.reference || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${typeColor}">${translate(m.type === 'Entrada' ? 'cash_entry_type_inflow' : 'cash_entry_type_outflow')}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">${m.status === 'Estimado' ? formatCurrency(value) : '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">${m.status === 'Realizado' ? formatCurrency(value) : '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${m.status}</td>
                </tr>
            `;
        }).join('');
    }
    
    // 4. Prepare data for chart
    const hasData = movements.length > 0;
    toggleChartVisibility('cash-flow-chart-empty-state', hasData);

    if (cashFlowChart) {
        cashFlowChart.destroy();
        cashFlowChart = null;
    }
    
    if (hasData) {
        const dailyTotals: Record<string, { estimated: number; realized: number }> = {};
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dailyTotals[dateStr] = { estimated: 0, realized: 0 };
        }

        movements.forEach(m => {
            if (!dailyTotals[m.date]) return; // Ensure movement is within the generated date range
            const value = m.type === 'Entrada' ? 1 : -1;
            if(m.status === 'Estimado') dailyTotals[m.date].estimated += (value * m.estimatedValue);
            if(m.status === 'Realizado') dailyTotals[m.date].realized += (value * m.realizedValue);
        });

        const sortedDates = Object.keys(dailyTotals).sort();
        let runningEstimated = openingBalance;
        let runningRealized = openingBalance;
        const estimatedBalanceData = [];
        const realizedBalanceData = [];

        for (const date of sortedDates) {
            runningEstimated += dailyTotals[date].estimated;
            runningRealized += dailyTotals[date].realized;
            estimatedBalanceData.push(runningEstimated);
            realizedBalanceData.push(runningRealized);
        }
        
        const ctx = (document.getElementById('cash-flow-chart') as HTMLCanvasElement).getContext('2d');
        cashFlowChart = new Chart(ctx!, {
            type: 'line',
            data: {
                labels: sortedDates.map(d => formatDate(d, state.currentLanguage, { month: 'short', day: 'numeric' })),
                datasets: [
                    { label: 'Saldo Estimado', data: estimatedBalanceData, borderColor: 'rgba(234, 179, 8, 0.8)', backgroundColor: 'rgba(234, 179, 8, 0.2)', fill: false, tension: 0.1, pointRadius: 2 },
                    { label: 'Saldo Realizado', data: realizedBalanceData, borderColor: 'rgba(20, 184, 166, 0.8)', backgroundColor: 'rgba(20, 184, 166, 0.2)', fill: false, tension: 0.1, pointRadius: 2 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { color: '#94a3b8' } } },
                scales: { 
                    y: { beginAtZero: false, ticks: { color: '#94a3b8', callback: (value) => formatCurrency(Number(value)) } },
                    x: { ticks: { color: '#94a3b8' } }
                }
            }
        });
    }
}

function exportCashFlowToExcel() {
    const movements = getCashFlowMovements();

    if (movements.length === 0) {
        showToast('toast_no_data_to_export', 'error');
        return;
    }

    const dataForExport = movements.map(m => {
        const estimatedValue = m.status === 'Estimado' ? m.estimatedValue : 0;
        const realizedValue = m.status === 'Realizado' ? m.realizedValue : 0;
        
        return {
            [translate('cash_flow_table_header_date')]: formatDate(m.date),
            [translate('cash_flow_table_header_description')]: m.description,
            [translate('cash_flow_table_header_reference')]: m.reference || '',
            [translate('cash_flow_table_header_type')]: translate(m.type === 'Entrada' ? 'cash_entry_type_inflow' : 'cash_entry_type_outflow'),
            [translate('cash_flow_table_header_estimated')]: estimatedValue,
            [translate('cash_flow_table_header_realized')]: realizedValue,
            [translate('cash_flow_table_header_status')]: m.status
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "FluxoDeCaixa");
    XLSX.writeFile(workbook, "Relatorio_Fluxo_de_Caixa.xlsx");
    
    showToast('toast_report_exported');
}

function toggleChartVisibility(chartContainerId: string, hasData: boolean) {
    const container = document.getElementById(chartContainerId);
    if (!container) return;
    const canvas = container.querySelector('canvas');
    const emptyState = container.querySelector('.chart-empty-state');

    if (canvas && emptyState) {
        if (hasData) {
            canvas.style.display = 'block';
            (emptyState as HTMLElement).style.display = 'none';
        } else {
            canvas.style.display = 'none';
            (emptyState as HTMLElement).style.display = 'flex';
        }
    }
}

function renderCategoryPieChart() {
    const data = getFilteredData();
    const expensesByCategory = data.reduce((acc, cp) => {
        const categoria = state.categorias.find(c => c.id === cp.categoriaId);
        if (categoria && categoria.type === 'Despesa') {
            const name = categoria.name;
            acc[name] = (acc[name] || 0) + cp.valor;
        }
        return acc;
    }, {} as Record<string, number>);

    const hasData = Object.keys(expensesByCategory).length > 0;
    toggleChartVisibility('category-chart-container', hasData);
    if (categoryPieChart) {
        categoryPieChart.destroy();
        categoryPieChart = null;
    }
    if (!hasData) return;

    const sortedCategories = Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a);
    const labels = sortedCategories.map(([name]) => name);
    const values = sortedCategories.map(([, value]) => value);

    const ctx = (document.getElementById('category-pie-chart') as HTMLCanvasElement).getContext('2d');
    
    const colors = [ '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e' ];

    categoryPieChart = new Chart(ctx!, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: translate('chart_label_total_value_paid'),
                data: values,
                backgroundColor: colors,
                borderColor: '#1e293b',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, padding: 20 } },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.label || ''}: ${formatCurrency(context.parsed)}`
                    }
                }
            },
            cutout: '70%'
        }
    });
}

function renderTopSuppliersBarChart() {
    const data = getFilteredData();
    const expensesBySupplier = data.reduce((acc, cp) => {
        const fornecedor = state.fornecedores.find(f => f.id === cp.fornecedorId);
        if (fornecedor) {
            acc[fornecedor.name] = (acc[fornecedor.name] || 0) + cp.valor;
        }
        return acc;
    }, {} as Record<string, number>);

    const sortedSuppliers = Object.entries(expensesBySupplier).sort(([, a], [, b]) => b - a).slice(0, 5);
        
    const hasData = sortedSuppliers.length > 0;
    toggleChartVisibility('supplier-chart-container', hasData);
    if (topSuppliersBarChart) {
        topSuppliersBarChart.destroy();
        topSuppliersBarChart = null;
    }
    if (!hasData) return;

    const labels = sortedSuppliers.map(([name]) => name);
    const values = sortedSuppliers.map(([, value]) => value);

    const ctx = (document.getElementById('top-suppliers-bar-chart') as HTMLCanvasElement).getContext('2d');
    topSuppliersBarChart = new Chart(ctx!, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: translate('chart_label_total_value_paid'),
                data: values,
                backgroundColor: 'rgba(20, 184, 166, 0.6)',
                borderColor: 'rgba(20, 184, 166, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { callback: (value) => formatCurrency(Number(value)).replace(/R\$\s?/, '') } } }
        }
    });
}

function renderMonthlyPaymentsChart() {
    const now = new Date();
    const labels: string[] = [];
    const paidData: number[] = [];
    const pendingData: number[] = [];

    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(new Intl.DateTimeFormat(state.currentLanguage, { month: 'short', year: '2-digit' }).format(d));
        
        const year = d.getFullYear();
        const month = d.getMonth();

        const paidInMonth = state.contasPagar
            .filter(cp => cp.status === 'Pago' && cp.paymentDate && new Date(cp.paymentDate + 'T00:00:00').getFullYear() === year && new Date(cp.paymentDate + 'T00:00:00').getMonth() === month)
            .reduce((sum, cp) => sum + cp.valor, 0);

        const pendingInMonth = state.contasPagar
            .filter(cp => {
                const dueDate = new Date(cp.vencimento + 'T00:00:00');
                return cp.status === 'Pendente' && dueDate.getFullYear() === year && dueDate.getMonth() === month;
            })
            .reduce((sum, cp) => sum + cp.valor, 0);

        paidData.push(paidInMonth);
        pendingData.push(pendingInMonth);
    }
    
    const hasData = paidData.some(v => v > 0) || pendingData.some(v => v > 0);
    toggleChartVisibility('monthly-chart-container', hasData);
    if (monthlyPaymentsColumnChart) {
        monthlyPaymentsColumnChart.destroy();
        monthlyPaymentsColumnChart = null;
    }
    if (!hasData) return;

    const ctx = (document.getElementById('monthly-payments-column-chart') as HTMLCanvasElement).getContext('2d');
    monthlyPaymentsColumnChart = new Chart(ctx!, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: translate('chart_legend_paid'), data: paidData, backgroundColor: 'rgba(34, 197, 94, 0.6)', borderColor: 'rgba(34, 197, 94, 1)', borderWidth: 1 },
                { label: translate('chart_legend_pending'), data: pendingData, backgroundColor: 'rgba(234, 179, 8, 0.6)', borderColor: 'rgba(234, 179, 8, 1)', borderWidth: 1 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, ticks: { callback: (value) => (Number(value) >= 1000000) ? `${Number(value) / 1000000}M` : (Number(value) >= 1000) ? `${Number(value) / 1000}k` : value } }
            }
        }
    });
}

function renderExtraCostsChart() {
    const extraCostCategoryIds = state.categorias.filter(c => c.group === 'Custos Extras').map(c => c.id);
    const extraCostsData = state.contasPagar.filter(cp => extraCostCategoryIds.includes(cp.categoriaId));

    const now = new Date();
    const labels: string[] = [];
    const monthlyTotals: number[] = [];

    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(new Intl.DateTimeFormat(state.currentLanguage, { month: 'short', year: '2-digit' }).format(d));
        
        const year = d.getFullYear();
        const month = d.getMonth();
        
        const totalInMonth = extraCostsData
            .filter(cp => {
                const checkDate = new Date((cp.paymentDate || cp.vencimento) + 'T00:00:00');
                return checkDate.getFullYear() === year && checkDate.getMonth() === month;
            })
            .reduce((sum, cp) => sum + cp.valor, 0);
        monthlyTotals.push(totalInMonth);
    }
    
    const hasData = monthlyTotals.some(v => v > 0);
    toggleChartVisibility('extra-costs-chart-container', hasData);
    if (extraCostsMonthlyChart) {
        extraCostsMonthlyChart.destroy();
        extraCostsMonthlyChart = null;
    }
    if (!hasData) return;

    const ctx = (document.getElementById('extra-costs-monthly-chart') as HTMLCanvasElement).getContext('2d');
    extraCostsMonthlyChart = new Chart(ctx!, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Custos Extras', data: monthlyTotals, backgroundColor: 'rgba(129, 140, 248, 0.6)', borderColor: 'rgba(129, 140, 248, 1)', borderWidth: 1 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: (value) => (Number(value) >= 1000000) ? `${Number(value) / 1000000}M` : (Number(value) >= 1000) ? `${Number(value) / 1000}k` : value } } }
        }
    });
}

function renderAnaliseView() {
    if (!document.getElementById('view-analise')?.classList.contains('active')) {
        return;
    }

    setTimeout(() => {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(100, 116, 139, 0.2)';

        renderCategoryPieChart();
        renderTopSuppliersBarChart();
        renderMonthlyPaymentsChart();
        renderExtraCostsChart();
    }, 50);
}

function populateMonthSelector(id: string, lang: Language) { /* Stub */ }
function populateYearSelector(id: string) { /* Stub */ }

async function handleFupUpload(e: Event) {
    if (!state.currentUser) return;
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
        try {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            const fupCollection = db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('fupDatabase');

            const docsToDelete = await fupCollection.get();
            const deleteBatch = db.batch();
            docsToDelete.forEach((doc: any) => deleteBatch.delete(doc.ref));
            await deleteBatch.commit();
            
            const addBatch = db.batch();
            jsonData.forEach(row => {
                const newRowRef = fupCollection.doc();
                addBatch.set(newRowRef, { ...row });
            });
            await addBatch.commit();

            showToast('toast_fup_loaded');
        } catch (error) {
            console.error('Error processing FUP file:', error);
            showToast('toast_fup_error', 'error');
        } finally {
            input.value = '';
        }
    };

    reader.onerror = () => {
        showToast('toast_fup_error', 'error');
        input.value = '';
    };

    reader.readAsBinaryString(file);
}

function downloadUploadTemplate() {
    const data = [
        {
            "Fornecedor": "Ex: Maersk Line",
            "Categoria": "Ex: Freight",
            "BL": "BL123456",
            "PO": "PO654321",
            "Nº da DI": "25/0187611-2",
            "NF": "NF987",
            "MIGO": "MIGO1",
            "MIRO": "MIRO1",
            "Vencimento (AAAA-MM-DD)": "2024-12-31",
            "Cond. Pagamento": "30 dias",
            "Valor Original": 1500.50,
            "Moeda (BRL, USD, CNY)": "USD",
            "Status (Pendente, Pago)": "Pendente",
            "Observacoes": "Pagamento referente ao frete 110"
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template_CP");
    XLSX.writeFile(workbook, "Template_Upload_CP.xlsx");
}

async function handleHistoricoUpload(e: Event) {
    if (!state.currentUser) return;
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
        try {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
            
            // Normalize headers to handle descriptive names like "Vencimento (AAAA-MM-DD)"
            const jsonDataNormalized = jsonData.map(row => {
               const normalizedRow: {[key: string]: any} = {};
               for (const key in row) {
                   if (Object.prototype.hasOwnProperty.call(row, key)) {
                       const normalizedKey = key.split('(')[0].trim();
                       normalizedRow[normalizedKey] = row[key];
                   }
               }
               return normalizedRow;
           });

            const cpCollection = db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('contasPagar');
            const batch = db.batch();
            let count = 0;
            
            const lastCpSnapshot = await cpCollection.orderBy('createdAt', 'desc').limit(1).get();
            let lastCpNumber = 0;
            if (!lastCpSnapshot.empty) {
                const lastCp = lastCpSnapshot.docs[0].data();
                const numPart = lastCp.cpNumber?.match(/\d+$/);
                if (numPart) {
                    lastCpNumber = parseInt(numPart[0], 10);
                }
            }

            for (const row of jsonDataNormalized) {
                let fornecedorId = state.fornecedores.find(f => f.name.toLowerCase() === row['Fornecedor']?.toLowerCase())?.id;
                let categoriaId = state.categorias.find(c => c.name.toLowerCase() === row['Categoria']?.toLowerCase())?.id;
                
                if (!fornecedorId || !categoriaId) {
                    console.warn(`Skipping row due to missing Fornecedor or Categoria:`, row);
                    continue;
                }
                
                const valorOriginal = typeof row['Valor Original'] === 'number' ? row['Valor Original'] : 0;
                const currency = ['BRL', 'USD', 'CNY'].includes(row['Moeda']) ? row['Moeda'] as Currency : 'BRL';
                let valor = valorOriginal;
                 if (currency === 'USD') valor = valorOriginal * 5.0; 
                 else if (currency === 'CNY') valor = valorOriginal * 0.7;

                let vencimento = '';
                if (typeof row['Vencimento'] === 'number') {
                    const excelEpoch = new Date(1899, 11, 30);
                    const date = new Date(excelEpoch.getTime() + row['Vencimento'] * 86400000);
                    vencimento = date.toISOString().split('T')[0];
                } else if (typeof row['Vencimento'] === 'string') {
                     try {
                        // Handle various date formats from different locales
                        const date = new Date(row['Vencimento']);
                        // Check if the date is valid before converting
                        if (!isNaN(date.getTime())) {
                            vencimento = date.toISOString().split('T')[0];
                        }
                    } catch (dateError) {
                        console.warn(`Skipping row due to invalid date format:`, row);
                        continue;
                    }
                } else if (row['Vencimento'] instanceof Date) {
                    vencimento = row['Vencimento'].toISOString().split('T')[0];
                }


                if (!vencimento) continue;

                lastCpNumber++;
                const newCpNumber = `CP-${lastCpNumber.toString().padStart(5, '0')}`;
                
                const newDocData: Omit<ContaPagar, 'id'> = {
                    cpNumber: newCpNumber,
                    fornecedorId,
                    categoriaId,
                    bl: row['BL'] || '',
                    po: row['PO'] || '',
                    diNumber: String(row['Nº da DI'] || ''),
                    nf: row['NF'] || '',
                    migo: row['MIGO'] || '',
                    miro: row['MIRO'] || '',
                    vencimento,
                    paymentTerm: row['Cond. Pagamento'] || '',
                    valor,
                    valorOriginal,
                    currency,
                    status: ['Pendente', 'Pago'].includes(row['Status']) ? row['Status'] : 'Pendente',
                    observacoes: row['Observacoes'] || '',
                    approvalStatus: 'Aprovado',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                };

                const newDocRef = cpCollection.doc();
                batch.set(newDocRef, newDocData);
                count++;
            }

            if (count > 0) {
                await batch.commit();
                showToast('toast_history_loaded');
            } else {
                 showToast('toast_no_data_to_export', 'error');
            }

        } catch (error) {
            console.error('Error processing history file:', error);
            showToast('toast_history_error', 'error');
        } finally {
            input.value = ''; 
        }
    };

    reader.onerror = () => {
        showToast('toast_history_error', 'error');
        input.value = '';
    };

    reader.readAsBinaryString(file);
}
function renderBudgetTable(month: number, year: number) { /* Stub */ }
// --- END STUBS ---

// --- FUP Report ---
const toSafeKey = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

const FUP_COLUMN_CONFIG = [
    // Identifiers
    { header: 'BL', key: 'bl', type: 'string' },
    { header: 'Cost Center', key: 'costCenter', type: 'string' },
    { header: 'PO Number', key: 'po', type: 'string' },
    { header: 'Cargo', key: 'cargo', type: 'string' },
    { header: 'Number of Cars', key: 'numberOfCars', type: 'number' },
    { header: 'Incoterm', key: 'incoterm', type: 'string' },
    { header: 'Unique DI', key: 'isUniqueDi', type: 'boolean' },
    { header: 'DI', key: 'diNumber', type: 'string' },
    { header: 'DI Date', key: 'diDate', type: 'date' },
    // Currency Info
    { header: 'CNY', key: 'cny', type: 'currency', currency: 'CNY' },
    { header: 'Taxa CNY', key: 'taxaCny', type: 'number' },
    { header: 'USD', key: 'usd', type: 'currency', currency: 'USD' },
    { header: 'Taxa USD', key: 'taxaUsd', type: 'number' },
    // International Costs
    { header: 'Freight', category: 'Freight', group: 'international', type: 'currency' },
    { header: 'Insurance', category: 'Insurance', group: 'international', type: 'currency' },
    { header: 'Total International', key: 'totalInternational', isTotal: true, sumOfGroups: ['international'], class: 'font-bold bg-sky-900/40 text-sky-300', type: 'currency' },
    // Government Taxes
    { header: 'II', category: 'II', group: 'taxes', type: 'currency' },
    { header: 'IPI', category: 'IPI', group: 'taxes', type: 'currency' },
    { header: 'PIS', category: 'PIS', group: 'taxes', type: 'currency' },
    { header: 'COFINS', category: 'COFINS', group: 'taxes', type: 'currency' },
    { header: 'ICMS', category: 'ICMS', group: 'taxes', type: 'currency' },
    { header: 'Total Taxes', key: 'totalTaxes', isTotal: true, sumOfGroups: ['taxes'], class: 'font-bold bg-rose-900/40 text-rose-300', type: 'currency' },
    // Government Fees
    { header: 'Antidumping', category: 'Antidumping', group: 'fees', type: 'currency' },
    { header: 'Siscomex', category: 'Siscomex', group: 'fees', type: 'currency' },
    { header: 'AFRMM', category: 'AFRMM', group: 'fees', type: 'currency' },
    { header: 'Total Fees', key: 'totalFees', isTotal: true, sumOfGroups: ['fees'], class: 'font-bold bg-amber-900/40 text-amber-300', type: 'currency' },
    // Customs Broker
    { header: 'Clearance Service', category: 'Clearance Service', group: 'broker', type: 'currency' },
    { header: 'Monitoring', category: 'Monitoring', group: 'broker', type: 'currency' },
    { header: 'SDA', category: 'SDA', group: 'broker', type: 'currency' },
    { header: 'ICMS Service', category: 'ICMS Service', group: 'broker', type: 'currency' },
    { header: 'NF Issue', category: 'NF Issue', group: 'broker', type: 'currency' },
    { header: 'Total Customs Broker', key: 'totalBroker', isTotal: true, sumOfGroups: ['broker'], class: 'font-bold bg-indigo-900/40 text-indigo-300', type: 'currency' },
    // Storage
    { header: 'Transport Port x Intermarítima', category: 'Transport Port x Intermarítima', group: 'storage', type: 'currency' },
    { header: 'Handling', category: 'Handling', group: 'storage', type: 'currency' },
    { header: 'Loose Cargo Handling', category: 'Loose Cargo Handling', group: 'storage', type: 'currency' },
    { header: 'Scanner', category: 'Scanner', group: 'storage', type: 'currency' },
    { header: 'Cargo Presence', category: 'Cargo Presence', group: 'storage', type: 'currency' },
    { header: '1st Period Storage', category: '1st Period Storage', group: 'storage', type: 'currency' },
    { header: 'GRIS', category: 'GRIS', group: 'storage', type: 'currency' },
    { header: 'Container Return', category: 'Container Return', group: 'storage', type: 'currency' },
    { header: 'Total Storage', key: 'totalStorage', isTotal: true, sumOfGroups: ['storage'], class: 'font-bold bg-fuchsia-900/40 text-fuchsia-300', type: 'currency' },
    // Transport
    { header: 'Transport', category: 'Transport', group: 'transport', type: 'currency' },
    { header: 'Total Transport Costs', key: 'totalTransport', isTotal: true, sumOfGroups: ['transport'], class: 'font-bold bg-lime-900/40 text-lime-300', type: 'currency' },
    // Destination Costs
    { header: 'THC', category: 'THC', group: 'destination', type: 'currency' },
    { header: 'Discharge Fee', category: 'Discharge Fee', group: 'destination', type: 'currency' },
    { header: 'ISPS', category: 'ISPS', group: 'destination', type: 'currency' },
    { header: 'BL Fee', category: 'BL Fee', group: 'destination', type: 'currency' },
    { header: 'Drop Off', category: 'Drop Off', group: 'destination', type: 'currency' },
    { header: 'Damage Protection', category: 'Damage Protection', group: 'destination', type: 'currency' },
    { header: 'Other Expenses', category: 'Other Expenses', group: 'destination', type: 'currency' },
    { header: 'Total Destination Costs', key: 'totalDestination', isTotal: true, sumOfGroups: ['destination'], class: 'font-bold bg-cyan-900/40 text-cyan-300', type: 'currency' },
    // Extra Costs
    { header: '2nd Period Storage', category: '2nd Period Storage', group: 'extra', type: 'currency' },
    { header: '3rd Period Storage', category: '3rd Period Storage', group: 'extra', type: 'currency' },
    { header: '4th Period Storage', category: '4th Period Storage', group: 'extra', type: 'currency' },
    { header: '5th Period Storage', category: '5th Period Storage', group: 'extra', type: 'currency' },
    { header: 'Mechanized Container Unloading', category: 'Mechanized Container Unloading', group: 'extra', type: 'currency' },
    { header: 'Extra Handling', category: 'Extra Handling', group: 'extra', type: 'currency' },
    { header: 'Container/Loose Cargo Positioning', category: 'Container/Loose Cargo Positioning', group: 'extra', type: 'currency' },
    { header: 'Weighting', category: 'Weighting', group: 'extra', type: 'currency' },
    { header: 'Container Washing', category: 'Container Washing', group: 'extra', type: 'currency' },
    { header: 'Tarping', category: 'Tarping', group: 'extra', type: 'currency' },
    { header: 'Extra GRIS', category: 'Extra GRIS', group: 'extra', type: 'currency' },
    { header: 'Others', category: 'Others', group: 'extra', type: 'currency' },
    { header: 'Demurage', category: 'Demurage', group: 'extra', type: 'currency' },
    { header: 'Document Fee', category: 'Document Fee', group: 'extra', type: 'currency' },
    { header: 'Extra Container Return', category: 'Extra Container Return', group: 'extra', type: 'currency' },
    { header: 'Total Extra Costs', key: 'totalExtra', isTotal: true, sumOfGroups: ['extra'], class: 'font-bold bg-red-900/40 text-red-300', type: 'currency' },
    // Grand Totals
    { header: 'Total Brazil Costs', key: 'totalBrazil', isTotal: true, sumOfGroups: ['taxes', 'fees', 'broker', 'storage', 'transport', 'destination', 'extra'], class: 'font-bold bg-slate-700 text-slate-100', type: 'currency' },
    { header: '% FOB Price', key: 'fobPricePercent', type: 'string' },
    { header: 'Total', key: 'grandTotal', isTotal: true, sumOfGroups: ['international', 'taxes', 'fees', 'broker', 'storage', 'transport', 'destination', 'extra'], class: 'font-bold bg-teal-800 text-teal-300', type: 'currency' },
    { header: '% Invoice Value', key: 'invoiceValuePercent', type: 'string' },
    // Other
    { header: 'Observations', key: 'observations', type: 'string' }
];


function generateFupReportData() {
    const filteredContasPagar = getFilteredData();
    const relevantEntries = filteredContasPagar.filter(cp => cp.bl && String(cp.bl).trim() !== '');

    if (relevantEntries.length === 0) {
        return { reportData: [], columns: FUP_COLUMN_CONFIG };
    }

    const categoryMap = new Map(state.categorias.map(c => [c.id, c]));
    
    // Add key to column config for easier access
    const columnsWithKeys = FUP_COLUMN_CONFIG.map(col => ({
        ...col,
        key: col.category ? toSafeKey(col.category) : col.key
    }));
    const categoryNameToKeyMap = new Map(columnsWithKeys.filter(c => c.category).map(c => [c.category!, c.key!]));

    const groupedByBl = relevantEntries.reduce((acc, cp) => {
        if (!acc[cp.bl]) {
            acc[cp.bl] = [];
        }
        acc[cp.bl].push(cp);
        return acc;
    }, {} as Record<string, ContaPagar[]>);

    const reportData = Object.entries(groupedByBl).map(([bl, entries]) => {
        const row: any = { bl };
        const firstEntry: Partial<ContaPagar> = entries[0] || {};
        
        columnsWithKeys.forEach(col => {
            if (col.type === 'currency' && col.key) row[col.key] = 0;
        });

        row.costCenter = firstEntry.costCenter;
        row.po = firstEntry.po;
        row.cargo = firstEntry.cargo;
        row.numberOfCars = firstEntry.numberOfCars;
        row.incoterm = firstEntry.incoterm;
        row.isUniqueDi = firstEntry.isUniqueDi;
        row.diNumber = firstEntry.diNumber;
        row.diDate = firstEntry.diDate;
        
        let cnyValue = 0;
        let usdValue = 0;
        let brlFromCny = 0;
        let brlFromUsd = 0;
        const observations = new Set<string>();

        entries.forEach(cp => {
            const category = categoryMap.get(cp.categoriaId);
            if (category) {
                const key = categoryNameToKeyMap.get(category.name);
                if (key && typeof row[key] === 'number') {
                    row[key] += cp.valor;
                }
            }

            if (cp.currency === 'CNY') {
                cnyValue += cp.valorOriginal;
                brlFromCny += cp.valor;
            } else if (cp.currency === 'USD') {
                usdValue += cp.valorOriginal;
                brlFromUsd += cp.valor;
            }
            if (cp.observacoes) {
                observations.add(cp.observacoes.trim());
            }
        });
        
        row.cny = cnyValue;
        row.usd = usdValue;
        row.taxaCny = cnyValue > 0 ? (brlFromCny / cnyValue) : 0;
        row.taxaUsd = usdValue > 0 ? (brlFromUsd / usdValue) : 0;
        row.observations = Array.from(observations).join('; ');

        columnsWithKeys.forEach(col => {
            if (col.isTotal && col.key) {
                let total = 0;
                columnsWithKeys.forEach(c => {
                    if (c.group && col.sumOfGroups!.includes(c.group) && c.key) {
                        total += row[c.key] || 0;
                    }
                });
                row[col.key] = total;
            }
        });
        
        row.fobPricePercent = 'N/A';
        row.invoiceValuePercent = 'N/A';

        return row;
    });

    return { reportData, columns: columnsWithKeys };
}

function renderFupReportView() {
    const tableElement = document.getElementById('fup-report-table')!;
    const emptyState = document.getElementById('fup-report-empty-state')!;
    
    const { reportData, columns } = generateFupReportData();

    if (reportData.length === 0) {
        tableElement.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    const headerHtml = `
        <tr class="bg-slate-900/50">
            ${columns.map(col => `<th class="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-900/80 backdrop-blur-sm ${col.class || ''}">${col.header}</th>`).join('')}
        </tr>
    `;

    const bodyHtml = reportData.map(row => `
        <tr class="hover:bg-slate-700/50">
            ${columns.map(col => {
                if (!col.key) return '<td></td>';
                let content;
                const value = row[col.key];
                switch(col.type) {
                    case 'currency':
                        content = formatCurrency(value || 0, (col as any).currency || 'BRL');
                        break;
                    case 'boolean':
                        content = value ? translate('option_yes') : translate('option_no');
                        break;
                    case 'date':
                        content = formatDate(value || '');
                        break;
                    case 'number':
                         if (col.key === 'taxaCny' || col.key === 'taxaUsd') {
                             content = (value || 0).toFixed(4);
                         } else {
                            content = value !== undefined && value !== null ? String(value) : '';
                         }
                        break;
                    default: // string
                        content = Array.isArray(value) ? value.join('; ') : String(value || '');
                }
                const alignClass = (col.type === 'currency' || col.type === 'number') ? 'text-right' : 'text-left';
                const textClass = col.type === 'currency' ? 'font-mono' : '';
                return `<td class="px-3 py-2 whitespace-nowrap ${alignClass} ${textClass} ${col.class || ''}">${content}</td>`;
            }).join('')}
        </tr>
    `).join('');

    tableElement.innerHTML = `<thead>${headerHtml}</thead><tbody class="divide-y divide-slate-700">${bodyHtml}</tbody>`;
}

async function exportFupReport() {
    const { reportData, columns } = generateFupReportData();
    if (reportData.length === 0) {
        showToast('toast_no_data_to_export', 'error');
        return;
    }

    const sheetData = reportData.map(row => {
        const exportRow: any = {};
        columns.forEach(col => {
            if (col.key) {
               exportRow[col.header] = row[col.key];
            }
        });
        return exportRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio FUP");
    XLSX.writeFile(workbook, "Relatorio_FUP.xlsx");
    
    showToast('toast_report_exported');
}


// --- AI Assistant Functions ---
function setAiLoading(isLoading: boolean) {
    const submitButton = document.getElementById('ai-submit-button') as HTMLButtonElement;
    const sendText = document.getElementById('ai-send-text') as HTMLElement;
    const spinner = document.getElementById('ai-loading-spinner') as HTMLElement;
    const input = document.getElementById('ai-input') as HTMLInputElement;

    if (isLoading) {
        submitButton.disabled = true;
        input.disabled = true;
        sendText.classList.add('hidden');
        spinner.classList.remove('hidden');
    } else {
        submitButton.disabled = input.value.trim().length === 0;
        input.disabled = false;
        sendText.classList.remove('hidden');
        spinner.classList.add('hidden');
        input.focus();
    }
}

function renderChatBubble(text: string, role: 'user' | 'ai', isError = false) {
    const chatArea = document.getElementById('ai-chat-area')!;
    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.classList.add('flex', 'items-start', 'gap-3', 'mb-4');
    
    const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-teal-400 hover:underline">$1</a>'); // Links

    if (role === 'user') {
        bubbleWrapper.classList.add('justify-end');
        bubbleWrapper.innerHTML = `
            <div class="bg-teal-500 rounded-lg p-3 max-w-md text-white">
                <p class="text-sm">${text}</p>
            </div>
            <div class="bg-slate-700 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-user text-slate-300"></i>
            </div>
        `;
    } else {
        const bubbleColor = isError ? 'bg-red-900/50' : 'bg-slate-700';
        const textColor = isError ? 'text-red-300' : 'text-slate-300';
        bubbleWrapper.innerHTML = `
            <div class="bg-slate-700 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-robot text-teal-400"></i>
            </div>
            <div class="${bubbleColor} rounded-lg p-3 max-w-md">
                <div class="text-sm ${textColor} space-y-2">${formattedText}</div>
            </div>
        `;
    }
    
    chatArea.appendChild(bubbleWrapper);
    chatArea.scrollTop = chatArea.scrollHeight;
}

async function handleAiQuery(e: Event) {
    e.preventDefault();
    if (!ai) {
        showToast('ai_error_generic', 'error');
        return;
    }
    const input = document.getElementById('ai-input') as HTMLInputElement;
    const query = input.value.trim();
    if (!query) return;

    setAiLoading(true);
    renderChatBubble(query, 'user');
    input.value = '';

    try {
        const dataContext = {
            fornecedores: state.fornecedores,
            categorias: state.categorias,
            contasPagar: getFilteredData()
        };
        
        const systemInstruction = translate('ai_system_instruction');
        
        // FIX: Use the recommended Gemini API call format.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `DATA:\n${JSON.stringify(dataContext)}\n\nQUESTION:\n${query}`,
            config: {
                systemInstruction,
            }
        });

        const text = response.text;
        renderChatBubble(text, 'ai');

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        renderChatBubble(translate('ai_error_generic'), 'ai', true);
    } finally {
        setAiLoading(false);
    }
}


// --- CRUD and Action Functions ---

async function confirmActionWithPassword(): Promise<string> {
    const passwordInput = document.getElementById('delete-password') as HTMLInputElement;
    passwordInput.value = '';
    (document.getElementById('password-error') as HTMLElement).textContent = '';
    openModal('modal-password-confirm');
    return new Promise((resolve, reject) => {
        passwordResolve = (password: string) => {
            const credential = firebase.auth.EmailAuthProvider.credential(state.currentUser.email, password);
            auth.currentUser.reauthenticateWithCredential(credential)
                .then(() => {
                    resolve(password);
                    closeModal('modal-password-confirm');
                })
                .catch((error: any) => {
                    console.error("Re-authentication failed:", error);
                    (document.getElementById('password-error') as HTMLElement).textContent = translate('password_modal_error');
                });
        };
        passwordReject = () => {
            reject(new Error("Action cancelled by user."));
        };
    });
}

function editFornecedor(id: string) {
    const fornecedor = state.fornecedores.find(f => f.id === id);
    if (fornecedor) {
        (document.getElementById('fornecedor-id') as HTMLInputElement).value = fornecedor.id;
        (document.getElementById('fornecedor-nome') as HTMLInputElement).value = fornecedor.name;
        openModal('modal-fornecedor');
    }
}

async function deleteFornecedor(id: string) {
    if (confirm(translate('confirm_delete_supplier'))) {
        try {
            await db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('fornecedores').doc(id).delete();
            showToast('toast_supplier_deleted');
        } catch (error) {
            console.error("Error deleting supplier:", error);
            showToast((error as Error).message, 'error');
        }
    }
}

function editCategoria(id: string) {
    const categoria = state.categorias.find(c => c.id === id);
    if (categoria) {
        (document.getElementById('categoria-id') as HTMLInputElement).value = categoria.id;
        (document.getElementById('categoria-nome') as HTMLInputElement).value = categoria.name;
        (document.getElementById('categoria-grupo') as HTMLInputElement).value = categoria.group;
        (document.querySelector(`input[name="categoria-type"][value="${categoria.type}"]`) as HTMLInputElement).checked = true;
        openModal('modal-categoria');
    }
}

async function deleteCategoria(id: string) {
    if (confirm(translate('confirm_delete_category'))) {
        try {
            await db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('categorias').doc(id).delete();
            showToast('toast_category_deleted');
        } catch (error) {
            console.error("Error deleting category:", error);
            showToast((error as Error).message, 'error');
        }
    }
}

function editCp(id: string) {
    const cp = state.contasPagar.find(c => c.id === id);
    if (cp) {
        const form = document.getElementById('form-cp') as HTMLFormElement;
        form.reset();
        
        (document.getElementById('cp-id') as HTMLInputElement).value = cp.id;
        (document.getElementById('cp-fornecedor') as HTMLSelectElement).value = cp.fornecedorId || '';
        (document.getElementById('cp-categoria') as HTMLSelectElement).value = cp.categoriaId || '';
        (document.getElementById('cp-bl') as HTMLInputElement).value = cp.bl || '';
        (document.getElementById('cp-po') as HTMLInputElement).value = cp.po || '';
        (document.getElementById('cp-nf') as HTMLInputElement).value = cp.nf || '';
        (document.getElementById('cp-migo') as HTMLInputElement).value = cp.migo || '';
        (document.getElementById('cp-miro') as HTMLInputElement).value = cp.miro || '';
        (document.getElementById('cp-vencimento') as HTMLInputElement).value = cp.vencimento || '';
        (document.getElementById('cp-payment-term') as HTMLInputElement).value = cp.paymentTerm || '';
        (document.getElementById('cp-valor-original') as HTMLInputElement).value = (cp.valorOriginal || 0).toString().replace('.', ',');
        (document.getElementById('cp-currency') as HTMLSelectElement).value = cp.currency || 'BRL';
        (document.getElementById('cp-status') as HTMLSelectElement).value = cp.status || 'Pendente';
        (document.getElementById('cp-observacoes') as HTMLTextAreaElement).value = cp.observacoes || '';
        (document.getElementById('cp-cost-center') as HTMLInputElement).value = cp.costCenter || '';
        (document.getElementById('cp-cargo') as HTMLInputElement).value = cp.cargo || '';
        (document.getElementById('cp-incoterm') as HTMLInputElement).value = cp.incoterm || '';
        (document.getElementById('cp-di-date') as HTMLInputElement).value = cp.diDate || '';
        (document.getElementById('cp-sap-po') as HTMLInputElement).value = cp.sapPo || '';
        (document.getElementById('cp-di-number') as HTMLInputElement).value = cp.diNumber || '';
        (document.getElementById('cp-vessel-name') as HTMLInputElement).value = cp.vesselName || '';
        (document.getElementById('cp-voyage') as HTMLInputElement).value = cp.voyage || '';
        (document.getElementById('cp-nf-type') as HTMLInputElement).value = cp.nfType || '';
        (document.getElementById('cp-nf-emission-date') as HTMLInputElement).value = cp.nfEmissionDate || '';
        (document.getElementById('cp-pr-number') as HTMLInputElement).value = cp.prNumber || '';
        (document.getElementById('cp-pr-emission-date') as HTMLInputElement).value = cp.prEmissionDate || '';
        (document.getElementById('cp-sap-po-emission-date') as HTMLInputElement).value = cp.sapPoEmissionDate || '';
        (document.getElementById('cp-nf-import-number') as HTMLInputElement).value = cp.nfImportNumber || '';
        (document.getElementById('cp-payment-method') as HTMLInputElement).value = cp.paymentMethod || '';
        (document.getElementById('cp-payment-date') as HTMLInputElement).value = cp.paymentDate || '';
        (document.getElementById('cp-cfop') as HTMLInputElement).value = cp.cfop || '';
        (document.getElementById('cp-is-adiantamento') as HTMLInputElement).checked = cp.isAdiantamento || false;
        (document.getElementById('cp-number-of-cars') as HTMLInputElement).value = cp.numberOfCars?.toString() || '';
        (document.getElementById('cp-is-unique-di') as HTMLSelectElement).value = cp.isUniqueDi === true ? 'true' : 'false';

        (document.getElementById('cp-modal-title') as HTMLElement).textContent = translate('cp_modal_title_edit');
        
        const cpNumberDisplay = document.getElementById('cp-number-display') as HTMLElement;
        cpNumberDisplay.textContent = cp.cpNumber || '';
        cpNumberDisplay.classList.remove('hidden');

        if(cp.status === 'Pago') {
             (document.getElementById('payment-date-wrapper') as HTMLElement).classList.remove('hidden');
        } else {
             (document.getElementById('payment-date-wrapper') as HTMLElement).classList.add('hidden');
        }
        
        openModal('modal-cp');
    }
}

async function deleteCp(id: string) {
    if (!ADMIN_UIDS.includes(state.currentUser.uid)) {
        showToast('toast_action_not_allowed', 'error');
        return;
    }
    try {
        await confirmActionWithPassword();
        await db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('contasPagar').doc(id).delete();
        showToast('toast_entry_deleted');
    } catch (error: any) {
        if (error.message.includes("cancelled")) {
            // Do nothing, user cancelled password prompt
        } else {
            console.error("Error deleting entry:", error);
            showToast(error.message, 'error');
        }
    }
}

async function markCpAsPaid(id: string) {
    const today = new Date().toISOString().split('T')[0];
    try {
        await db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('contasPagar').doc(id).update({
            status: 'Pago',
            paymentDate: today
        });
        showToast('toast_entry_paid');
    } catch (error) {
        console.error("Error marking as paid:", error);
        showToast((error as Error).message, 'error');
    }
}

async function approveCp(id: string) {
    try {
        await db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('contasPagar').doc(id).update({
            approvalStatus: 'Aprovado'
        });
        showToast('toast_entry_approved');
    } catch (error) {
        console.error("Error approving entry:", error);
        showToast((error as Error).message, 'error');
    }
}

async function rejectCp(id: string) {
     try {
        await db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('contasPagar').doc(id).update({
            approvalStatus: 'Rejeitado'
        });
        showToast('toast_entry_rejected');
    } catch (error) {
        console.error("Error rejecting entry:", error);
        showToast((error as Error).message, 'error');
    }
}

async function toggleReconciliation(id: string) {
    const cp = state.contasPagar.find(c => c.id === id);
    if (!cp) return;
    
    try {
        await db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('contasPagar').doc(id).update({
            reconciled: !cp.reconciled
        });
        showToast('toast_entry_reconciled');
    } catch(error) {
         console.error("Error updating reconciliation status:", error);
        showToast((error as Error).message, 'error');
    }
}
async function deleteAllCps() {
     if (!ADMIN_UIDS.includes(state.currentUser.uid)) {
        showToast('toast_action_not_allowed', 'error');
        return;
    }

    if (!confirm(translate('confirm_delete_all_entries'))) return;

    try {
        await confirmActionWithPassword();
        const cpCollection = db.collection('users').doc(SHARED_DATA_OWNER_UID).collection('contasPagar');
        
        // Firestore limits batch writes to 500 documents. We delete in chunks.
        const query = cpCollection.limit(500);
        
        while (true) {
            const snapshot = await query.get();
            if (snapshot.size === 0) {
                break; // No more documents to delete
            }
        
            const batch = db.batch();
            snapshot.docs.forEach((doc:any) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        showToast('toast_all_entries_deleted');
    } catch (error: any) {
         if (error.message.includes("cancelled")) {
            // Do nothing, user cancelled
        } else {
            console.error("Error deleting all entries:", error);
            showToast('Error deleting entries.', 'error');
        }
    }
}

function exportEntriesToExcel() {
    const data = getFilteredData();
     if (data.length === 0) {
        showToast('toast_no_data_to_export', 'error');
        return;
    }

    const dataForExport = data.map(cp => {
        const fornecedor = state.fornecedores.find(f => f.id === cp.fornecedorId)?.name || '';
        const categoria = state.categorias.find(c => c.id === cp.categoriaId)?.name || '';
        return {
            "Nº CP": cp.cpNumber,
            "Status": cp.status,
            "Aprovação": cp.approvalStatus,
            "Vencimento": formatDate(cp.vencimento),
            "Data Pagamento": cp.paymentDate ? formatDate(cp.paymentDate) : '',
            "Fornecedor": fornecedor,
            "Categoria": categoria,
            "Valor Original": cp.valorOriginal,
            "Moeda": cp.currency,
            "Valor (BRL)": cp.valor,
            "BL": cp.bl,
            "PO": cp.po,
            "NF": cp.nf,
            "MIGO": cp.migo,
            "MIRO": cp.miro,
            "Observações": cp.observacoes
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contas a Pagar");
    XLSX.writeFile(workbook, "Contas_a_Pagar.xlsx");

    showToast('toast_report_exported');
}

// --- MAIN EVENT LISTENERS AND APP INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen')!;
    const appContainer = document.getElementById('app-container')!;
    const loginForm = document.getElementById('login-form')!;
    const logoutButton = document.getElementById('logout-button')!;
    const usernameDisplay = document.getElementById('username-display')!;
    const loginError = document.getElementById('login-error')!;
    
    // --- Authentication ---
    auth.onAuthStateChanged((user: any) => {
        if (user) {
            state.currentUser = user;
            usernameDisplay.textContent = user.displayName || user.email;
            loginScreen.style.display = 'none';
            appContainer.classList.remove('hidden');
            document.getElementById('user-info')?.classList.remove('hidden');
            document.getElementById('user-info')?.classList.add('flex');
            
            // Set admin class on body for CSS selectors
            document.body.classList.toggle('is-admin', ADMIN_UIDS.includes(user.uid));

            listenToData(); // Fetch user data and set up listeners
        } else {
            state.currentUser = null;
            state.unsubscribeListeners.forEach(unsub => unsub());
            state.unsubscribeListeners = [];
            loginScreen.style.display = 'flex';
            appContainer.classList.add('hidden');
            document.getElementById('user-info')?.classList.add('hidden');
            document.getElementById('user-info')?.classList.remove('flex');
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        loginError.classList.add('hidden');
        auth.signInWithEmailAndPassword(email, password)
            .catch((error: any) => {
                console.error("Login failed:", error.message);
                loginError.classList.remove('hidden');
            });
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut();
    });

    // --- Tab Navigation ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const views = document.querySelectorAll('.view-container');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewName = button.getAttribute('data-view');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            views.forEach(view => {
                if (view.id === `view-${viewName}`) {
                    view.classList.add('active');
                } else {
                    view.classList.remove('active');
                }
            });
            
             if (viewName === 'analise') {
                renderAnaliseView();
            } else if (viewName === 'fluxo-caixa') {
                renderFluxoCaixaView();
            }
        });
    });

     // --- Modal Handling ---
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal-backdrop');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // --- Language Switcher ---
    const langSwitcherButton = document.getElementById('lang-switcher-button')!;
    const langSwitcherDropdown = document.getElementById('lang-switcher-dropdown')!;
    langSwitcherButton.addEventListener('click', () => {
        langSwitcherDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!langSwitcherButton.contains(e.target as Node)) {
            langSwitcherDropdown.classList.add('hidden');
        }
    });
    langSwitcherDropdown.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const lang = (e.currentTarget as HTMLElement).dataset.lang as Language;
            setCurrentLanguage(lang);
            langSwitcherDropdown.classList.add('hidden');
        });
    });
    
    // --- General Buttons ---
    document.getElementById('fornecedores')?.addEventListener('click', () => openModal('modal-fornecedor'));
    document.getElementById('categorias')?.addEventListener('click', () => openModal('modal-categoria'));
    document.getElementById('settings')?.addEventListener('click', () => openModal('modal-settings'));
    document.getElementById('btn-new-cp')?.addEventListener('click', openNewCpModal);
    document.getElementById('btn-new-cash-entry')?.addEventListener('click', () => openModal('modal-cash-entry'));
    document.getElementById('btn-set-budget')?.addEventListener('click', () => openModal('modal-orcamento'));
    document.getElementById('btn-delete-all-cp')?.addEventListener('click', deleteAllCps);
    document.getElementById('btn-export-cash-flow')?.addEventListener('click', exportCashFlowToExcel);


    // --- AI Assistant ---
    document.getElementById('ai-fab')?.addEventListener('click', () => openModal('modal-ai'));
    document.getElementById('ai-modal-close')?.addEventListener('click', () => closeModal('modal-ai'));
    document.getElementById('form-ai')?.addEventListener('submit', handleAiQuery);
    document.getElementById('ai-input')?.addEventListener('input', (e) => {
        const input = e.target as HTMLInputElement;
        const button = document.getElementById('ai-submit-button') as HTMLButtonElement;
        button.disabled = input.value.trim().length === 0;
    });

    // --- Filters ---
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    const dateStartFilter = document.getElementById('date-filter-start') as HTMLInputElement;
    const dateEndFilter = document.getElementById('date-filter-end') as HTMLInputElement;
    
    const applyFilters = () => {
        state.activeFilters.search = searchInput.value;
        state.activeFilters.status = statusFilter.value;
        state.activeFilters.dateStart = dateStartFilter.value;
        state.activeFilters.dateEnd = dateEndFilter.value;
        state.activeStatFilter = null; // Clear stat filter when main filters are used
        
        // Remove active class from all stat cards
        document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active'));
        
        updateUI();
    };
    
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    statusFilter.addEventListener('change', applyFilters);
    dateStartFilter.addEventListener('change', applyFilters);
    dateEndFilter.addEventListener('change', applyFilters);
    
    document.getElementById('clear-filters-button')?.addEventListener('click', () => {
        searchInput.value = '';
        statusFilter.value = 'all';
        dateStartFilter.value = '';
        dateEndFilter.value = '';
        applyFilters();
    });

    // --- Grouped View Filters ---
    document.getElementById('bl-filter-input')?.addEventListener('input', debounce((e: Event) => renderBlView((e.target as HTMLInputElement).value), 300));
    document.getElementById('po-filter-input')?.addEventListener('input', debounce((e: Event) => renderPoView((e.target as HTMLInputElement).value), 300));
    document.getElementById('di-filter-input')?.addEventListener('input', debounce((e: Event) => renderDiView((e.target as HTMLInputElement).value), 300));
    document.getElementById('fup-database-search')?.addEventListener('input', debounce((e: Event) => renderFupDatabaseView((e.target as HTMLInputElement).value), 300));
    document.getElementById('conciliation-filter-toggle')?.addEventListener('change', renderConciliacaoView);
    document.getElementById('cash-flow-period')?.addEventListener('change', renderFluxoCaixaView);


    // --- Event Delegation for Dynamic Content ---
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('.action-btn');
        const statCard = target.closest('.stat-card');

        if (button) {
            const id = button.getAttribute('data-id');
            if (!id) return;

            if (button.classList.contains('edit-cp')) editCp(id);
            else if (button.classList.contains('delete-cp')) deleteCp(id);
            else if (button.classList.contains('mark-paid-cp')) markCpAsPaid(id);
            else if (button.classList.contains('approve-cp')) approveCp(id);
            else if (button.classList.contains('reject-cp')) rejectCp(id);
            else if (button.classList.contains('edit-fornecedor')) editFornecedor(id);
            else if (button.classList.contains('delete-fornecedor')) deleteFornecedor(id);
            else if (button.classList.contains('edit-categoria')) editCategoria(id);
            else if (button.classList.contains('delete-categoria')) deleteCategoria(id);
            else if (button.classList.contains('toggle-reconciliation')) toggleReconciliation(id);
        }
        
        if (statCard) {
            const filter = statCard.getAttribute('data-stat-filter');
            
            // Toggle active state
            if (state.activeStatFilter === filter) {
                state.activeStatFilter = null;
                statCard.classList.remove('active');
            } else {
                document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active'));
                state.activeStatFilter = filter;
                statCard.classList.add('active');
            }
             // Clear main filters when a stat card is clicked
            (document.getElementById('searchInput') as HTMLInputElement).value = '';
            (document.getElementById('status-filter') as HTMLSelectElement).value = 'all';
            (document.getElementById('date-filter-start') as HTMLInputElement).value = '';
            (document.getElementById('date-filter-end') as HTMLInputElement).value = '';
            state.activeFilters = { search: '', status: 'all', dateStart: '', dateEnd: '' };

            updateUI();
        }

        // Expand/Collapse All
        if(target.closest('.expand-all-btn')) {
            const listId = (target.closest('.expand-all-btn') as HTMLElement).dataset.listId;
            // FIX: Cast the selected element to HTMLDetailsElement to access the 'open' property.
            document.querySelectorAll<HTMLDetailsElement>(`#${listId} details`).forEach(d => d.open = true);
        }
         if(target.closest('.collapse-all-btn')) {
            const listId = (target.closest('.collapse-all-btn') as HTMLElement).dataset.listId;
            // FIX: Cast the selected element to HTMLDetailsElement to access the 'open' property.
            document.querySelectorAll<HTMLDetailsElement>(`#${listId} details`).forEach(d => d.open = false);
        }

    });
    
    // --- Upload Buttons ---
    document.getElementById('btn-upload-historico')?.addEventListener('click', () => document.getElementById('historico-file-input')?.click());
    document.getElementById('historico-file-input')?.addEventListener('change', handleHistoricoUpload);
    document.getElementById('btn-download-template')?.addEventListener('click', downloadUploadTemplate);
    document.getElementById('fup-upload-trigger')?.addEventListener('click', () => document.getElementById('fup-file-input')?.click());
    document.getElementById('fup-file-input')?.addEventListener('change', handleFupUpload);
    
    // --- Form Submissions ---
    document.getElementById('form-password-confirm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = (document.getElementById('delete-password') as HTMLInputElement).value;
        if(passwordResolve) {
            passwordResolve(password);
        }
    });

    // Add other form submissions here...
    document.getElementById('form-settings')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Handle settings save logic
    });
    document.getElementById('form-fornecedor')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Handle supplier add/edit logic
    });
    document.getElementById('form-categoria-add')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Handle category add/edit logic
    });
     document.getElementById('form-cp')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Handle CP add/edit logic
    });
    document.getElementById('form-cash-entry')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Handle cash entry add/edit logic
    });

});
