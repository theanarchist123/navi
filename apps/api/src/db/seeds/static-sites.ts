export const staticSiteConfigs = [
  {
    "schemaVersion": 2,
    "siteId": "00000000-0000-4000-8000-000000000001",
    "slug": "central-stores",
    "name": "Central Stores",
    "theme": {
      "primary": "#0F766E",
      "secondary": "#0D9488"
    },
    "shell": "sidebar",
    "layouts": [
      {
        "id": "dashboard",
        "type": "dashboard"
      },
      {
        "id": "data-table",
        "type": "data-table"
      }
    ],
    "modules": {
      "nodes": [
        {
          "id": "auth-rbac",
          "moduleType": "auth-rbac",
          "position": {
            "x": 0,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "user-management",
          "moduleType": "user-management",
          "position": {
            "x": 280,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "inventory",
          "moduleType": "inventory",
          "position": {
            "x": 560,
            "y": 0
          },
          "config": {
            "lowStockThreshold": 10
          }
        },
        {
          "id": "dashboard-shell",
          "moduleType": "dashboard-shell",
          "position": {
            "x": 840,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "analytics-dashboard",
          "moduleType": "analytics-dashboard",
          "position": {
            "x": 0,
            "y": 160
          },
          "config": {}
        },
        {
          "id": "reports-excel",
          "moduleType": "reports-excel",
          "position": {
            "x": 280,
            "y": 160
          },
          "config": {}
        }
      ],
      "edges": [
        {
          "id": "auth-rbac.identity-out->dashboard-shell.identity-in",
          "sourceNodeId": "auth-rbac",
          "sourcePortId": "identity-out",
          "targetNodeId": "dashboard-shell",
          "targetPortId": "identity-in"
        },
        {
          "id": "auth-rbac.identity-out->user-management.identity-in",
          "sourceNodeId": "auth-rbac",
          "sourcePortId": "identity-out",
          "targetNodeId": "user-management",
          "targetPortId": "identity-in"
        },
        {
          "id": "inventory.stock-out->reports-excel.stock-in",
          "sourceNodeId": "inventory",
          "sourcePortId": "stock-out",
          "targetNodeId": "reports-excel",
          "targetPortId": "stock-in"
        }
      ]
    },
    "pages": [
      {
        "id": "home",
        "title": "Dashboard",
        "path": "dashboard",
        "nodeId": "dashboard-shell",
        "layoutId": "dashboard",
        "requiredPermission": "dashboard:view"
      },
      {
        "id": "users",
        "title": "Users",
        "path": "users",
        "nodeId": "user-management",
        "layoutId": "data-table",
        "requiredPermission": "users:view"
      },
      {
        "id": "inventory",
        "title": "Inventory",
        "path": "inventory",
        "nodeId": "inventory",
        "layoutId": "data-table",
        "requiredPermission": "inventory:view"
      },
      {
        "id": "analytics",
        "title": "Analytics",
        "path": "analytics",
        "nodeId": "analytics-dashboard",
        "layoutId": "dashboard",
        "requiredPermission": "analytics:view"
      },
      {
        "id": "reports",
        "title": "Reports",
        "path": "reports",
        "nodeId": "reports-excel",
        "layoutId": "data-table",
        "requiredPermission": "reports:view"
      }
    ],
    "roles": [
      {
        "id": "admin",
        "name": "Administrator",
        "permissions": [
          "auth:manage",
          "users:view",
          "users:manage",
          "inventory:view",
          "inventory:manage",
          "dashboard:view",
          "analytics:view",
          "reports:view",
          "reports:export"
        ]
      },
      {
        "id": "storekeeper",
        "name": "Storekeeper",
        "permissions": [
          "dashboard:view",
          "inventory:view",
          "inventory:manage",
          "reports:view",
          "reports:export",
          "analytics:view"
        ]
      },
      {
        "id": "viewer",
        "name": "Viewer",
        "permissions": [
          "dashboard:view",
          "inventory:view",
          "analytics:view"
        ]
      }
    ],
    "navigation": [
      {
        "pageId": "home",
        "label": "Dashboard"
      },
      {
        "pageId": "users",
        "label": "Users"
      },
      {
        "pageId": "inventory",
        "label": "Inventory"
      },
      {
        "pageId": "analytics",
        "label": "Analytics"
      },
      {
        "pageId": "reports",
        "label": "Reports"
      }
    ],
    "workflowDefinitions": [],
    "calculatedFieldDefinitions": [
      {
        "id": "stock-shortfall",
        "label": "Shortfall vs reorder level",
        "expression": "max(reorderLevel - onHand, 0)",
        "inputs": {
          "reorderLevel": "number",
          "onHand": "number"
        },
        "resultType": "number"
      }
    ],
    "fields": [
      {
        "id": "item-price",
        "entity": "inventory_item",
        "key": "price",
        "label": "Unit price",
        "type": "number",
        "required": false,
        "hidden": false
      }
    ],
    "customFields": [],
    "reports": {
      "inventory": {
        "title": "Inventory report",
        "exportRoles": [
          "admin",
          "storekeeper",
          "viewer"
        ],
        "importRoles": [
          "admin",
          "storekeeper"
        ],
        "maskColumns": {
          "storekeeper": [
            "unitCost",
            "vendorMargin",
            "totalValue"
          ],
          "viewer": [
            "unitCost",
            "vendorMargin",
            "totalValue"
          ]
        }
      }
    },
    "metadata": {
      "description": "Central Stores seed configuration (development demo)"
    }
  },
  {
    "schemaVersion": 2,
    "siteId": "00000000-0000-4000-8000-000000000002",
    "slug": "service-centre",
    "name": "Service Centre",
    "theme": {
      "primary": "#1D4ED8",
      "secondary": "#EA580C"
    },
    "shell": "topbar",
    "layouts": [
      {
        "id": "kanban",
        "type": "kanban"
      },
      {
        "id": "data-table",
        "type": "data-table"
      },
      {
        "id": "dashboard",
        "type": "dashboard"
      }
    ],
    "modules": {
      "nodes": [
        {
          "id": "auth-rbac",
          "moduleType": "auth-rbac",
          "position": {
            "x": 0,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "user-management",
          "moduleType": "user-management",
          "position": {
            "x": 280,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "dashboard-shell",
          "moduleType": "dashboard-shell",
          "position": {
            "x": 560,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "request",
          "moduleType": "request",
          "position": {
            "x": 840,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "approval",
          "moduleType": "approval",
          "position": {
            "x": 0,
            "y": 160
          },
          "config": {}
        },
        {
          "id": "pcb-repair",
          "moduleType": "pcb-repair",
          "position": {
            "x": 280,
            "y": 160
          },
          "config": {}
        },
        {
          "id": "return-management",
          "moduleType": "return-management",
          "position": {
            "x": 560,
            "y": 160
          },
          "config": {}
        },
        {
          "id": "analytics-dashboard",
          "moduleType": "analytics-dashboard",
          "position": {
            "x": 840,
            "y": 160
          },
          "config": {}
        }
      ],
      "edges": [
        {
          "id": "auth-rbac.identity-out->dashboard-shell.identity-in",
          "sourceNodeId": "auth-rbac",
          "sourcePortId": "identity-out",
          "targetNodeId": "dashboard-shell",
          "targetPortId": "identity-in"
        },
        {
          "id": "auth-rbac.identity-out->user-management.identity-in",
          "sourceNodeId": "auth-rbac",
          "sourcePortId": "identity-out",
          "targetNodeId": "user-management",
          "targetPortId": "identity-in"
        },
        {
          "id": "request.request-out->approval.request-in",
          "sourceNodeId": "request",
          "sourcePortId": "request-out",
          "targetNodeId": "approval",
          "targetPortId": "request-in"
        }
      ]
    },
    "pages": [
      {
        "id": "home",
        "title": "Dashboard",
        "path": "dashboard",
        "nodeId": "dashboard-shell",
        "layoutId": "dashboard",
        "requiredPermission": "dashboard:view"
      },
      {
        "id": "users",
        "title": "Users",
        "path": "users",
        "nodeId": "user-management",
        "layoutId": "data-table",
        "requiredPermission": "users:view"
      },
      {
        "id": "requests",
        "title": "Requests",
        "path": "requests",
        "nodeId": "request",
        "layoutId": "kanban",
        "requiredPermission": "request:view"
      },
      {
        "id": "approvals",
        "title": "Approvals",
        "path": "approvals",
        "nodeId": "approval",
        "layoutId": "data-table",
        "requiredPermission": "approval:view"
      },
      {
        "id": "pcb-repair",
        "title": "PCB Repair",
        "path": "pcb-repair",
        "nodeId": "pcb-repair",
        "layoutId": "kanban",
        "requiredPermission": "repair:view"
      },
      {
        "id": "returns",
        "title": "Returns",
        "path": "returns",
        "nodeId": "return-management",
        "layoutId": "data-table",
        "requiredPermission": "return:view"
      },
      {
        "id": "analytics",
        "title": "Analytics",
        "path": "analytics",
        "nodeId": "analytics-dashboard",
        "layoutId": "dashboard",
        "requiredPermission": "analytics:view"
      }
    ],
    "roles": [
      {
        "id": "admin",
        "name": "Administrator",
        "permissions": [
          "auth:manage",
          "users:view",
          "users:manage",
          "dashboard:view",
          "request:view",
          "request:create",
          "approval:view",
          "approval:decide",
          "repair:view",
          "repair:update",
          "return:view",
          "return:process",
          "analytics:view"
        ]
      },
      {
        "id": "technician",
        "name": "Technician",
        "permissions": [
          "dashboard:view",
          "request:view",
          "request:create",
          "repair:view",
          "repair:update",
          "return:view"
        ]
      },
      {
        "id": "approver",
        "name": "Approver",
        "permissions": [
          "dashboard:view",
          "request:view",
          "approval:view",
          "approval:decide",
          "analytics:view"
        ]
      }
    ],
    "navigation": [
      {
        "pageId": "home",
        "label": "Dashboard"
      },
      {
        "pageId": "users",
        "label": "Users"
      },
      {
        "pageId": "requests",
        "label": "Requests"
      },
      {
        "pageId": "approvals",
        "label": "Approvals"
      },
      {
        "pageId": "pcb-repair",
        "label": "PCB Repair"
      },
      {
        "pageId": "returns",
        "label": "Returns"
      },
      {
        "pageId": "analytics",
        "label": "Analytics"
      }
    ],
    "workflowDefinitions": [
      {
        "id": "request-flow",
        "initial": "draft",
        "states": [
          "draft",
          "submitted",
          "approved",
          "rejected",
          "assigned",
          "fulfilled",
          "cancelled"
        ],
        "transitions": [
          {
            "from": "draft",
            "to": "submitted",
            "permission": "request:create"
          },
          {
            "from": "submitted",
            "to": "approved",
            "permission": "approval:decide"
          },
          {
            "from": "submitted",
            "to": "rejected",
            "permission": "approval:decide"
          },
          {
            "from": "assigned",
            "to": "fulfilled"
          },
          {
            "from": "draft",
            "to": "cancelled"
          },
          {
            "from": "submitted",
            "to": "cancelled"
          }
        ]
      },
      {
        "id": "repair-flow",
        "initial": "received",
        "states": [
          "received",
          "diagnosing",
          "repairing",
          "testing",
          "completed",
          "scrapped"
        ],
        "transitions": [
          {
            "from": "received",
            "to": "diagnosing",
            "permission": "repair:update"
          },
          {
            "from": "diagnosing",
            "to": "repairing",
            "permission": "repair:update"
          },
          {
            "from": "diagnosing",
            "to": "scrapped",
            "permission": "repair:update"
          },
          {
            "from": "repairing",
            "to": "testing",
            "permission": "repair:update"
          },
          {
            "from": "testing",
            "to": "completed",
            "permission": "repair:update"
          },
          {
            "from": "testing",
            "to": "repairing",
            "permission": "repair:update"
          }
        ]
      }
    ],
    "calculatedFieldDefinitions": [],
    "fields": [],
    "customFields": [],
    "reports": {},
    "metadata": {
      "description": "Service Centre seed configuration (development demo)"
    }
  },
  {
    "schemaVersion": 2,
    "siteId": "00000000-0000-4000-8000-000000000003",
    "slug": "distribution",
    "name": "Distribution",
    "theme": {
      "primary": "#6D28D9",
      "secondary": "#0891B2"
    },
    "shell": "workbench",
    "layouts": [
      {
        "id": "split-workspace",
        "type": "split-workspace"
      },
      {
        "id": "data-table",
        "type": "data-table"
      },
      {
        "id": "dashboard",
        "type": "dashboard"
      }
    ],
    "modules": {
      "nodes": [
        {
          "id": "auth-rbac",
          "moduleType": "auth-rbac",
          "position": {
            "x": 0,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "user-management",
          "moduleType": "user-management",
          "position": {
            "x": 280,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "dashboard-shell",
          "moduleType": "dashboard-shell",
          "position": {
            "x": 560,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "request",
          "moduleType": "request",
          "position": {
            "x": 840,
            "y": 0
          },
          "config": {}
        },
        {
          "id": "approval",
          "moduleType": "approval",
          "position": {
            "x": 0,
            "y": 160
          },
          "config": {}
        },
        {
          "id": "material-assignment",
          "moduleType": "material-assignment",
          "position": {
            "x": 280,
            "y": 160
          },
          "config": {}
        },
        {
          "id": "assignment-frontend",
          "moduleType": "assignment-frontend",
          "position": {
            "x": 560,
            "y": 160
          },
          "config": {}
        },
        {
          "id": "consumption-tracking",
          "moduleType": "consumption-tracking",
          "position": {
            "x": 840,
            "y": 160
          },
          "config": {}
        },
        {
          "id": "analytics-dashboard",
          "moduleType": "analytics-dashboard",
          "position": {
            "x": 0,
            "y": 320
          },
          "config": {}
        }
      ],
      "edges": [
        {
          "id": "auth-rbac.identity-out->dashboard-shell.identity-in",
          "sourceNodeId": "auth-rbac",
          "sourcePortId": "identity-out",
          "targetNodeId": "dashboard-shell",
          "targetPortId": "identity-in"
        },
        {
          "id": "auth-rbac.identity-out->user-management.identity-in",
          "sourceNodeId": "auth-rbac",
          "sourcePortId": "identity-out",
          "targetNodeId": "user-management",
          "targetPortId": "identity-in"
        },
        {
          "id": "request.request-out->approval.request-in",
          "sourceNodeId": "request",
          "sourcePortId": "request-out",
          "targetNodeId": "approval",
          "targetPortId": "request-in"
        },
        {
          "id": "approval.approved-out->material-assignment.approved-in",
          "sourceNodeId": "approval",
          "sourcePortId": "approved-out",
          "targetNodeId": "material-assignment",
          "targetPortId": "approved-in"
        },
        {
          "id": "material-assignment.assignment-out->assignment-frontend.assignment-in",
          "sourceNodeId": "material-assignment",
          "sourcePortId": "assignment-out",
          "targetNodeId": "assignment-frontend",
          "targetPortId": "assignment-in"
        },
        {
          "id": "material-assignment.assignment-out->consumption-tracking.assignment-in",
          "sourceNodeId": "material-assignment",
          "sourcePortId": "assignment-out",
          "targetNodeId": "consumption-tracking",
          "targetPortId": "assignment-in"
        }
      ]
    },
    "pages": [
      {
        "id": "home",
        "title": "Dashboard",
        "path": "dashboard",
        "nodeId": "dashboard-shell",
        "layoutId": "dashboard",
        "requiredPermission": "dashboard:view"
      },
      {
        "id": "users",
        "title": "Users",
        "path": "users",
        "nodeId": "user-management",
        "layoutId": "data-table",
        "requiredPermission": "users:view"
      },
      {
        "id": "requests",
        "title": "Requests",
        "path": "requests",
        "nodeId": "request",
        "layoutId": "data-table",
        "requiredPermission": "request:view"
      },
      {
        "id": "approvals",
        "title": "Approvals",
        "path": "approvals",
        "nodeId": "approval",
        "layoutId": "data-table",
        "requiredPermission": "approval:view"
      },
      {
        "id": "assignments",
        "title": "Material Assignment",
        "path": "assignments",
        "nodeId": "material-assignment",
        "layoutId": "split-workspace",
        "requiredPermission": "assignment:view"
      },
      {
        "id": "assignment-workbench",
        "title": "Assignment Workbench",
        "path": "assignment-workbench",
        "nodeId": "assignment-frontend",
        "layoutId": "split-workspace",
        "requiredPermission": "assignment:view"
      },
      {
        "id": "consumption",
        "title": "Consumption",
        "path": "consumption",
        "nodeId": "consumption-tracking",
        "layoutId": "data-table",
        "requiredPermission": "consumption:view"
      },
      {
        "id": "analytics",
        "title": "Analytics",
        "path": "analytics",
        "nodeId": "analytics-dashboard",
        "layoutId": "dashboard",
        "requiredPermission": "analytics:view"
      }
    ],
    "roles": [
      {
        "id": "admin",
        "name": "Administrator",
        "permissions": [
          "auth:manage",
          "users:view",
          "users:manage",
          "dashboard:view",
          "request:view",
          "request:create",
          "approval:view",
          "approval:decide",
          "assignment:view",
          "assignment:create",
          "consumption:view",
          "consumption:record",
          "analytics:view"
        ]
      },
      {
        "id": "dispatcher",
        "name": "Dispatcher",
        "permissions": [
          "dashboard:view",
          "request:view",
          "request:create",
          "assignment:view",
          "assignment:create",
          "consumption:view",
          "consumption:record"
        ]
      },
      {
        "id": "approver",
        "name": "Approver",
        "permissions": [
          "dashboard:view",
          "request:view",
          "approval:view",
          "approval:decide",
          "analytics:view"
        ]
      }
    ],
    "navigation": [
      {
        "pageId": "home",
        "label": "Dashboard"
      },
      {
        "pageId": "users",
        "label": "Users"
      },
      {
        "pageId": "requests",
        "label": "Requests"
      },
      {
        "pageId": "approvals",
        "label": "Approvals"
      },
      {
        "pageId": "assignments",
        "label": "Material Assignment"
      },
      {
        "pageId": "assignment-workbench",
        "label": "Assignment Workbench"
      },
      {
        "pageId": "consumption",
        "label": "Consumption"
      },
      {
        "pageId": "analytics",
        "label": "Analytics"
      }
    ],
    "workflowDefinitions": [
      {
        "id": "request-flow",
        "initial": "draft",
        "states": [
          "draft",
          "submitted",
          "approved",
          "rejected",
          "assigned",
          "fulfilled",
          "cancelled"
        ],
        "transitions": [
          {
            "from": "draft",
            "to": "submitted",
            "permission": "request:create"
          },
          {
            "from": "submitted",
            "to": "approved",
            "permission": "approval:decide"
          },
          {
            "from": "submitted",
            "to": "rejected",
            "permission": "approval:decide"
          },
          {
            "from": "approved",
            "to": "assigned",
            "permission": "assignment:create"
          },
          {
            "from": "assigned",
            "to": "fulfilled"
          },
          {
            "from": "draft",
            "to": "cancelled"
          },
          {
            "from": "submitted",
            "to": "cancelled"
          }
        ]
      }
    ],
    "calculatedFieldDefinitions": [],
    "fields": [],
    "customFields": [],
    "reports": {},
    "metadata": {
      "description": "Distribution seed configuration (development demo)"
    }
  }
] as const;
