const gatewayStages = ["Identity", "Untrusted input", "Tool plan", "Runtime gateway"];

export function GatewayRunRail() {
  return (
    <div className="gateway-run-rail" aria-label="Gateway evaluation stages">
      {gatewayStages.map((stage) => (
        <span key={stage}>{stage}</span>
      ))}
    </div>
  );
}
