export const APPLICATION_IDENTITY = {
  brand: "iNSIGHTS",
  execution: "Project HUB",
  structure: "AI To-Do engine",
  continuation: "Grant + onboarding",
  productThinking: "Deep Search",
  referenceDirection: "https://thorecoin.com/"
};

const MODE_SEMANTICS = {
  "document-text": {
    modeLabel: "iNSIGHTS",
    operatingLayer: "AI To-Do engine"
  },
  "document-upload": {
    modeLabel: "Project HUB",
    operatingLayer: "Execution"
  },
  "image-upload": {
    modeLabel: "iNSIGHTS",
    operatingLayer: "Continuation"
  },
  summary: {
    modeLabel: "Execution",
    operatingLayer: "Project HUB"
  },
  goal: {
    modeLabel: "Grant + onboarding",
    operatingLayer: "Continuation"
  },
  chat: {
    modeLabel: "Grant + onboarding",
    operatingLayer: "Continuation"
  },
  daily: {
    modeLabel: "Execution",
    operatingLayer: "AI To-Do engine"
  },
  "deep-search": {
    modeLabel: "Deep Search",
    operatingLayer: "Product thinking"
  }
};

export function getApplicationIdentity() {
  return { ...APPLICATION_IDENTITY };
}

export function getProductBlueprint() {
  return [
    {
      label: "Execution",
      value: APPLICATION_IDENTITY.execution
    },
    {
      label: "Structure",
      value: APPLICATION_IDENTITY.structure
    },
    {
      label: "Continuation",
      value: APPLICATION_IDENTITY.continuation
    },
    {
      label: "Product thinking",
      value: APPLICATION_IDENTITY.productThinking
    }
  ];
}

export function getModeSemantics(mode) {
  return MODE_SEMANTICS[mode] || {
    modeLabel: APPLICATION_IDENTITY.brand,
    operatingLayer: APPLICATION_IDENTITY.structure
  };
}

export function buildApplicationModel(mode) {
  return {
    identity: getApplicationIdentity(),
    blueprint: getProductBlueprint(),
    currentMode: {
      mode,
      ...getModeSemantics(mode)
    }
  };
}

export function getProductPromptContext() {
  return `Application identity:
- Brand: ${APPLICATION_IDENTITY.brand}
- Execution: ${APPLICATION_IDENTITY.execution}
- Structure: ${APPLICATION_IDENTITY.structure}
- Continuation: ${APPLICATION_IDENTITY.continuation}
- Product thinking: ${APPLICATION_IDENTITY.productThinking}`;
}
  