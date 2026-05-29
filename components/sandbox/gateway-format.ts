export function formatToolName(toolName: string) {
  const names: Record<string, string> = {
    read_email: "Read email",
    lookup_customer_profile: "Lookup profile",
    fetch_relevant_account_data: "Fetch account data",
    create_support_ticket: "Create ticket",
    draft_customer_reply: "Draft reply",
    send_email: "Send email",
    export_customer_records: "Export records",
    disable_account_restrictions: "Disable restrictions",
    fetch_url: "Fetch URL",
    extract_page_facts: "Extract facts",
    create_research_note: "Create note",
    execute_code: "Execute code",
    read_invoice: "Read invoice",
    classify_invoice: "Classify invoice",
    create_finance_ticket: "Create finance ticket",
    vendor_lookup: "Vendor lookup",
    update_payment_details: "Payment update",
    approve_refund: "Approve refund",
    wire_transfer: "Wire transfer",
    credential_access: "Credential access",
    delete_customer_record: "Delete record",
    download_binary: "Download file",
    post_to_external_service: "External post",
    send_external_email_without_approval: "Unapproved external email"
  };

  return names[toolName] ?? toTitleCase(toolName);
}

export function formatPolicyName(policyName: string) {
  const names: Record<string, string> = {
    "Least agency boundary": "Least agency",
    "Tool boundary enforcement": "Tool boundary",
    "Data boundary enforcement": "Data boundary",
    "Human approval checkpoint": "Human approval",
    "Prompt-injection isolation": "Prompt isolation",
    "Data exfiltration shield": "Exfiltration shield",
    "Credential access shield": "Credential shield",
    "Destructive action shield": "Destructive shield",
    "Downstream execution gate": "Downstream gate"
  };

  return names[policyName] ?? policyName;
}

export function formatThreatTag(tag: string) {
  return toTitleCase(tag);
}

export function formatCapability(value: string) {
  return formatToolName(value);
}

function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
