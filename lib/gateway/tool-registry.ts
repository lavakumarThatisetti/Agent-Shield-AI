import type { ToolManifest } from "@/lib/gateway/types";

const unknownTool = (toolName: string): ToolManifest => ({
  toolName,
  label: toolName.replaceAll("_", " "),
  category: "Unregistered tool",
  effect: "internal_write",
  dataClasses: [],
  sideEffect: true,
  destination: "unknown",
  requiresApproval: true,
  baseRisk: 72
});

export const toolRegistry: Record<string, ToolManifest> = {
  read_email: {
    toolName: "read_email",
    label: "Read email",
    category: "Inbox read",
    effect: "read",
    dataClasses: ["support_context"],
    sideEffect: false,
    destination: "none",
    requiresApproval: false,
    baseRisk: 8
  },
  lookup_customer_profile: {
    toolName: "lookup_customer_profile",
    label: "Lookup profile",
    category: "Customer context",
    effect: "read",
    dataClasses: ["customer_profile"],
    sideEffect: false,
    destination: "none",
    requiresApproval: false,
    baseRisk: 16
  },
  fetch_relevant_account_data: {
    toolName: "fetch_relevant_account_data",
    label: "Fetch account data",
    category: "Scoped account read",
    effect: "read",
    dataClasses: ["customer_record"],
    sideEffect: false,
    destination: "none",
    requiresApproval: false,
    baseRisk: 24
  },
  create_support_ticket: {
    toolName: "create_support_ticket",
    label: "Create ticket",
    category: "Support write",
    effect: "internal_write",
    dataClasses: ["support_context"],
    sideEffect: true,
    destination: "internal",
    requiresApproval: false,
    baseRisk: 30
  },
  draft_customer_reply: {
    toolName: "draft_customer_reply",
    label: "Draft reply",
    category: "Draft communication",
    effect: "internal_write",
    dataClasses: ["support_context"],
    sideEffect: false,
    destination: "internal",
    requiresApproval: false,
    baseRisk: 20
  },
  send_email: {
    toolName: "send_email",
    label: "Send email",
    category: "External communication",
    effect: "external_send",
    dataClasses: ["customer_record"],
    sideEffect: true,
    destination: "external",
    requiresApproval: true,
    baseRisk: 68
  },
  export_customer_records: {
    toolName: "export_customer_records",
    label: "Export records",
    category: "Bulk data export",
    effect: "bulk_export",
    dataClasses: ["bulk_customer_records"],
    sideEffect: true,
    destination: "external",
    requiresApproval: true,
    baseRisk: 96
  },
  disable_account_restrictions: {
    toolName: "disable_account_restrictions",
    label: "Disable restrictions",
    category: "Account control",
    effect: "destructive_update",
    dataClasses: ["customer_record"],
    sideEffect: true,
    destination: "internal",
    requiresApproval: true,
    baseRisk: 94
  },
  fetch_url: {
    toolName: "fetch_url",
    label: "Fetch URL",
    category: "Public web read",
    effect: "read",
    dataClasses: ["public"],
    sideEffect: false,
    destination: "none",
    requiresApproval: false,
    baseRisk: 12
  },
  extract_page_facts: {
    toolName: "extract_page_facts",
    label: "Extract facts",
    category: "Research read",
    effect: "read",
    dataClasses: ["public"],
    sideEffect: false,
    destination: "none",
    requiresApproval: false,
    baseRisk: 18
  },
  create_research_note: {
    toolName: "create_research_note",
    label: "Create note",
    category: "Research write",
    effect: "internal_write",
    dataClasses: ["research_note"],
    sideEffect: true,
    destination: "internal",
    requiresApproval: false,
    baseRisk: 22
  },
  execute_code: {
    toolName: "execute_code",
    label: "Execute code",
    category: "Code execution",
    effect: "code_execution",
    dataClasses: ["local_system", "credential"],
    sideEffect: true,
    destination: "unknown",
    requiresApproval: true,
    baseRisk: 96
  },
  read_invoice: {
    toolName: "read_invoice",
    label: "Read invoice",
    category: "Invoice read",
    effect: "read",
    dataClasses: ["invoice"],
    sideEffect: false,
    destination: "none",
    requiresApproval: false,
    baseRisk: 12
  },
  classify_invoice: {
    toolName: "classify_invoice",
    label: "Classify invoice",
    category: "Invoice triage",
    effect: "read",
    dataClasses: ["invoice"],
    sideEffect: false,
    destination: "none",
    requiresApproval: false,
    baseRisk: 16
  },
  create_finance_ticket: {
    toolName: "create_finance_ticket",
    label: "Create finance ticket",
    category: "Finance write",
    effect: "internal_write",
    dataClasses: ["invoice"],
    sideEffect: true,
    destination: "internal",
    requiresApproval: false,
    baseRisk: 28
  },
  vendor_lookup: {
    toolName: "vendor_lookup",
    label: "Vendor lookup",
    category: "Vendor read",
    effect: "read",
    dataClasses: ["vendor_profile"],
    sideEffect: false,
    destination: "none",
    requiresApproval: false,
    baseRisk: 18
  },
  update_payment_details: {
    toolName: "update_payment_details",
    label: "Payment update",
    category: "Payment change",
    effect: "financial_update",
    dataClasses: ["financial_account"],
    sideEffect: true,
    destination: "internal",
    requiresApproval: true,
    baseRisk: 96
  }
};

export function getToolManifest(toolName: string) {
  return toolRegistry[toolName] ?? unknownTool(toolName);
}
