import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  inventoryItemCategories,
  inventoryTransactionTypes,
  type InventoryItemCategory,
  type InventoryTransactionType,
  type MobileInventoryItem,
  type MobileInventoryTransaction,
} from "@koko/types";
import { formatDate, formatDateTime } from "@koko/utils";
import {
  createMobileTransaction,
  fetchMobileInventory,
  fetchMobileInventoryItem,
  fetchMobileTransactions,
  type MobileInventoryDetailsResponse,
  type MobileInventoryListResponse,
  type MobileTransactionsResponse,
} from "./lib/api";

type TabKey = "inventory" | "transactions";

type ActionType = {
  item: MobileInventoryItem;
  transactionType: InventoryTransactionType;
};

type TransactionFormState = {
  quantity: string;
  reason: string;
  notes: string;
  referenceNumber: string;
  adjustmentDirection: "INCREASE" | "DECREASE";
};

const CATEGORY_LABELS: Record<InventoryItemCategory | "ALL", string> = {
  ALL: "All",
  RAW_MATERIAL: "Raw Material",
  CONSUMABLE: "Consumable",
  PACKAGING: "Packaging",
  TOOL: "Tool",
};

function getStockStatus(currentStock: number, minimumStock: number) {
  if (currentStock < minimumStock) {
    return { label: "Below Minimum", tone: "critical" as const };
  }

  if (currentStock <= minimumStock * 1.2) {
    return { label: "Low Stock", tone: "warning" as const };
  }

  return { label: "Healthy", tone: "healthy" as const };
}

function getTransactionLabel(transactionType: InventoryTransactionType) {
  switch (transactionType) {
    case "RECEIVE":
      return "Receive";
    case "ISSUE":
      return "Issue";
    case "WASTE":
      return "Waste";
    case "ADJUSTMENT":
      return "Adjust";
    case "RETURN":
      return "Return";
    default:
      return transactionType;
  }
}

function getToneStyles(tone: "healthy" | "warning" | "critical") {
  switch (tone) {
    case "healthy":
      return styles.badgeHealthy;
    case "warning":
      return styles.badgeWarning;
    case "critical":
      return styles.badgeCritical;
  }
}

function ModuleCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: "healthy" | "warning" | "critical";
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statPill, getToneStyles(tone)]} />
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statDescription}>{description}</Text>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  variant,
  onPress,
}: {
  label: string;
  variant: "primary" | "secondary" | "ghost";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionButton,
        variant === "primary" && styles.actionButtonPrimary,
        variant === "secondary" && styles.actionButtonSecondary,
        variant === "ghost" && styles.actionButtonGhost,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          variant === "primary" && styles.actionButtonTextPrimary,
          variant === "secondary" && styles.actionButtonTextSecondary,
          variant === "ghost" && styles.actionButtonTextGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function ItemCard({
  item,
  onPress,
  onAction,
}: {
  item: MobileInventoryItem;
  onPress: () => void;
  onAction: (transactionType: InventoryTransactionType) => void;
}) {
  const status = getStockStatus(item.currentStock, item.minimumStock);

  return (
    <Pressable onPress={onPress} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>{item.sku}</Text>
        </View>
        <View style={[styles.stockBadge, getToneStyles(status.tone)]}>
          <Text style={styles.stockBadgeText}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.itemMetaRow}>
        <Text style={styles.itemMetaLabel}>Stock</Text>
        <Text style={styles.itemMetaValue}>
          {item.currentStock.toLocaleString()} {item.unit}
        </Text>
      </View>
      <View style={styles.itemMetaRow}>
        <Text style={styles.itemMetaLabel}>Minimum</Text>
        <Text style={styles.itemMetaValue}>
          {item.minimumStock.toLocaleString()} {item.unit}
        </Text>
      </View>
      <View style={styles.itemMetaRow}>
        <Text style={styles.itemMetaLabel}>Location</Text>
        <Text style={styles.itemMetaValue}>{item.storageLocation}</Text>
      </View>
      <View style={styles.itemMetaRow}>
        <Text style={styles.itemMetaLabel}>Supplier</Text>
        <Text style={styles.itemMetaValue}>
          {item.supplierName ?? "Not assigned"}
        </Text>
      </View>

      <View style={styles.itemActionsRow}>
        <ActionButton
          label="Receive"
          variant="primary"
          onPress={() => onAction("RECEIVE")}
        />
        <ActionButton
          label="Issue"
          variant="secondary"
          onPress={() => onAction("ISSUE")}
        />
        <ActionButton
          label="Adjust"
          variant="ghost"
          onPress={() => onAction("ADJUSTMENT")}
        />
      </View>
    </Pressable>
  );
}

function TransactionRow({
  transaction,
}: {
  transaction: MobileInventoryTransaction;
}) {
  const status =
    transaction.transactionType === "RECEIVE" ||
    transaction.transactionType === "RETURN"
      ? "healthy"
      : transaction.transactionType === "WASTE"
        ? "critical"
        : transaction.transactionType === "ADJUSTMENT"
          ? "warning"
          : "warning";

  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.transactionItemName}>
            {transaction.inventoryItemName}
          </Text>
          <Text style={styles.transactionMeta}>
            {transaction.inventoryItemSku}
          </Text>
        </View>
        <View style={[styles.stockBadge, getToneStyles(status)]}>
          <Text style={styles.stockBadgeText}>
            {getTransactionLabel(transaction.transactionType)}
          </Text>
        </View>
      </View>
      <Text style={styles.transactionReason}>{transaction.reason}</Text>
      <Text style={styles.transactionMeta}>
        {transaction.quantity.toLocaleString()} • {transaction.userName} •{" "}
        {formatDateTime(transaction.createdAt)}
      </Text>
      {transaction.referenceNumber ? (
        <Text style={styles.transactionMeta}>
          Ref: {transaction.referenceNumber}
        </Text>
      ) : null}
    </View>
  );
}

function TransactionModal({
  visible,
  action,
  onClose,
  onSaved,
}: {
  visible: boolean;
  action: ActionType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TransactionFormState>({
    quantity: "",
    reason: "",
    notes: "",
    referenceNumber: "",
    adjustmentDirection: "INCREASE",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setForm({
        quantity: "",
        reason: "",
        notes: "",
        referenceNumber: "",
        adjustmentDirection: "INCREASE",
      });
      setError(null);
    }
  }, [visible, action]);

  async function submit() {
    if (!action) return;

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }

    if (form.reason.trim().length < 2) {
      setError("Reason is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createMobileTransaction({
        inventoryItemId: action.item.id,
        transactionType: action.transactionType,
        quantity,
        reason: form.reason,
        notes: form.notes,
        referenceNumber: form.referenceNumber,
        adjustmentDirection:
          action.transactionType === "ADJUSTMENT"
            ? form.adjustmentDirection
            : undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save transaction",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!action) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {getTransactionLabel(action.transactionType)}
          </Text>
          <Text style={styles.modalSubtitle}>
            {action.item.name} • {action.item.sku}
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Quantity</Text>
              <TextInput
                keyboardType="decimal-pad"
                value={form.quantity}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, quantity: value }))
                }
                placeholder="0.00"
                placeholderTextColor="#52525b"
                style={styles.input}
              />
            </View>

            {action.transactionType === "ADJUSTMENT" ? (
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>Adjustment Direction</Text>
                <View style={styles.inlineRow}>
                  <Chip
                    label="Increase"
                    active={form.adjustmentDirection === "INCREASE"}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        adjustmentDirection: "INCREASE",
                      }))
                    }
                  />
                  <Chip
                    label="Decrease"
                    active={form.adjustmentDirection === "DECREASE"}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        adjustmentDirection: "DECREASE",
                      }))
                    }
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Reason</Text>
              <TextInput
                value={form.reason}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, reason: value }))
                }
                placeholder="Reason for transaction"
                placeholderTextColor="#52525b"
                style={styles.input}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Reference Number</Text>
              <TextInput
                value={form.referenceNumber}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, referenceNumber: value }))
                }
                placeholder="Optional reference"
                placeholderTextColor="#52525b"
                style={styles.input}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>Notes</Text>
              <TextInput
                value={form.notes}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, notes: value }))
                }
                placeholder="Optional notes"
                placeholderTextColor="#52525b"
                style={[styles.input, styles.multilineInput]}
                multiline
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <ActionButton label="Cancel" variant="ghost" onPress={onClose} />
              <Pressable
                onPress={submit}
                style={[
                  styles.modalSaveButton,
                  saving && styles.modalSaveButtonDisabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ItemDetailsModal({
  visible,
  itemId,
  onClose,
  onAction,
}: {
  visible: boolean;
  itemId: string | null;
  onClose: () => void;
  onAction: (action: ActionType) => void;
}) {
  const [data, setData] = useState<MobileInventoryDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !itemId) return;

    let active = true;
    setLoading(true);
    setError(null);

    fetchMobileInventoryItem(itemId)
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load item");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visible, itemId]);

  if (!itemId) return null;

  const item = data?.item;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCardLarge}>
          {loading ? (
            <View style={styles.centeredBlock}>
              <ActivityIndicator color="#ffffff" />
              <Text style={styles.modalSubtitle}>Loading item history...</Text>
            </View>
          ) : error ? (
            <View style={styles.centeredBlock}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : item ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 16 }}
            >
              <View>
                <Text style={styles.modalTitle}>{item.name}</Text>
                <Text style={styles.modalSubtitle}>{item.sku}</Text>
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailTile}>
                  <Text style={styles.modalFieldLabel}>Current Stock</Text>
                  <Text style={styles.detailValue}>
                    {item.currentStock.toLocaleString()} {item.unit}
                  </Text>
                </View>
                <View style={styles.detailTile}>
                  <Text style={styles.modalFieldLabel}>Minimum Stock</Text>
                  <Text style={styles.detailValue}>
                    {item.minimumStock.toLocaleString()} {item.unit}
                  </Text>
                </View>
                <View style={styles.detailTile}>
                  <Text style={styles.modalFieldLabel}>Location</Text>
                  <Text style={styles.detailValue}>{item.storageLocation}</Text>
                </View>
                <View style={styles.detailTile}>
                  <Text style={styles.modalFieldLabel}>Supplier</Text>
                  <Text style={styles.detailValue}>
                    {item.supplierName ?? "Not assigned"}
                  </Text>
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>QR Code</Text>
                <Text style={styles.qrCodeValue}>{item.qrCode}</Text>
              </View>

              <View>
                <Text style={styles.sectionTitle}>History</Text>
                {data.transactions.length === 0 ? (
                  <Text style={styles.sectionSubtitle}>
                    No transactions yet.
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {data.transactions.map((transaction) => (
                      <View key={transaction.id} style={styles.historyRow}>
                        <View style={styles.transactionTopRow}>
                          <Text style={styles.transactionItemName}>
                            {getTransactionLabel(transaction.transactionType)}
                          </Text>
                          <Text style={styles.transactionMeta}>
                            {formatDateTime(transaction.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.transactionReason}>
                          {transaction.quantity.toLocaleString()} units
                        </Text>
                        <Text style={styles.transactionMeta}>
                          {transaction.reason}
                        </Text>
                        <Text style={styles.transactionMeta}>
                          {transaction.userName}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.itemActionsRow}>
                <ActionButton
                  label="Receive"
                  variant="primary"
                  onPress={() => onAction({ item, transactionType: "RECEIVE" })}
                />
                <ActionButton
                  label="Issue"
                  variant="secondary"
                  onPress={() => onAction({ item, transactionType: "ISSUE" })}
                />
                <ActionButton
                  label="Adjust"
                  variant="ghost"
                  onPress={() =>
                    onAction({ item, transactionType: "ADJUSTMENT" })
                  }
                />
              </View>

              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("inventory");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<InventoryItemCategory | "ALL">(
    "ALL",
  );
  const [inventoryResponse, setInventoryResponse] =
    useState<MobileInventoryListResponse | null>(null);
  const [transactionsResponse, setTransactionsResponse] =
    useState<MobileTransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [actionVisible, setActionVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  async function loadInventory() {
    const response = await fetchMobileInventory({
      search,
      category,
      page: 1,
      pageSize: 20,
    });
    setInventoryResponse(response);
  }

  async function loadTransactions() {
    const response = await fetchMobileTransactions({
      search,
      page: 1,
      pageSize: 20,
    });
    setTransactionsResponse(response);
  }

  async function refreshCurrentTab() {
    setRefreshing(true);
    try {
      if (activeTab === "inventory") {
        await loadInventory();
      } else {
        await loadTransactions();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        if (activeTab === "inventory") {
          const response = await fetchMobileInventory({
            search,
            category,
            page: 1,
            pageSize: 20,
          });
          if (active) setInventoryResponse(response);
        } else {
          const response = await fetchMobileTransactions({
            search,
            page: 1,
            pageSize: 20,
          });
          if (active) setTransactionsResponse(response);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [activeTab, search, category]);

  const inventoryItems = inventoryResponse?.items ?? [];
  const recentTransactions =
    inventoryResponse?.recentTransactions ?? transactionsResponse?.rows ?? [];

  const summaryCards = useMemo(() => {
    const lowStockCount = inventoryResponse?.summary.lowStockCount ?? 0;
    const criticalStockCount =
      inventoryResponse?.summary.criticalStockCount ?? 0;
    const inProgressCount = inventoryItems.length;
    return [
      {
        title: "Inventory Items",
        value: String(inProgressCount),
        description: "Active materials and consumables",
        tone:
          inProgressCount === 0 ? ("warning" as const) : ("healthy" as const),
      },
      {
        title: "Low Stock",
        value: String(lowStockCount),
        description: "Items near reorder point",
        tone: lowStockCount === 0 ? ("healthy" as const) : ("warning" as const),
      },
      {
        title: "Critical",
        value: String(criticalStockCount),
        description: "Items below minimum",
        tone:
          criticalStockCount === 0
            ? ("healthy" as const)
            : ("critical" as const),
      },
      {
        title: "Recent Tx",
        value: String(recentTransactions.length),
        description: "Latest stock movements",
        tone:
          recentTransactions.length === 0
            ? ("warning" as const)
            : ("healthy" as const),
      },
    ];
  }, [inventoryResponse, inventoryItems.length, recentTransactions.length]);

  const selectedCategoryLabel = CATEGORY_LABELS[category];

  function openTransactionModal(
    item: MobileInventoryItem,
    transactionType: InventoryTransactionType,
  ) {
    setSelectedAction({ item, transactionType });
    setActionVisible(true);
  }

  function closeTransactionModal() {
    setActionVisible(false);
    setSelectedAction(null);
  }

  function openHistory(itemId: string) {
    setSelectedItemId(itemId);
    setHistoryVisible(true);
  }

  async function handleSavedTransaction() {
    try {
      await refreshCurrentTab();
      if (selectedItemId) {
        const response = await fetchMobileInventoryItem(selectedItemId);
        // the modal fetches this on its own, but refreshing the inventory list keeps the cards current
        void response;
      }
    } catch (err) {
      Alert.alert(
        "Sync failed",
        err instanceof Error ? err.message : "Please refresh manually.",
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <TransactionModal
        visible={actionVisible}
        action={selectedAction}
        onClose={closeTransactionModal}
        onSaved={handleSavedTransaction}
      />

      <ItemDetailsModal
        visible={historyVisible}
        itemId={selectedItemId}
        onClose={() => setHistoryVisible(false)}
        onAction={(action) => {
          setHistoryVisible(false);
          openTransactionModal(action.item, action.transactionType);
        }}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshCurrentTab}
            tintColor="#ffffff"
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>KOKO MOS</Text>
            <Text style={styles.subtitle}>Inventory Transactions</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={refreshCurrentTab}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            Factory-ready inventory workflow
          </Text>
          <Text style={styles.bannerText}>
            Scan on the floor, update stock instantly, and keep every movement
            auditable.
          </Text>
          <Text style={styles.bannerMeta}>
            Connected to the web API at the same source of truth.
          </Text>
        </View>

        <View style={styles.tabRow}>
          <Chip
            label="Inventory"
            active={activeTab === "inventory"}
            onPress={() => setActiveTab("inventory")}
          />
          <Chip
            label="Transactions"
            active={activeTab === "transactions"}
            onPress={() => setActiveTab("transactions")}
          />
        </View>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.sectionSubtitle}>
              Loading mobile inventory...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorBlock}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          {summaryCards.map((card) => (
            <ModuleCard key={card.title} {...card} />
          ))}
        </View>

        {activeTab === "inventory" ? (
          <View style={{ gap: 14 }}>
            <SectionHeader
              title="Inventory"
              subtitle={`Showing ${selectedCategoryLabel.toLowerCase()} items and quick transaction actions.`}
            />

            <View style={styles.searchBox}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or SKU"
                placeholderTextColor="#52525b"
                style={styles.searchInput}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <Chip
                label="All"
                active={category === "ALL"}
                onPress={() => setCategory("ALL")}
              />
              {inventoryItemCategories.map((itemCategory) => (
                <Chip
                  key={itemCategory}
                  label={CATEGORY_LABELS[itemCategory]}
                  active={category === itemCategory}
                  onPress={() => setCategory(itemCategory)}
                />
              ))}
            </ScrollView>

            <View style={{ gap: 12 }}>
              {inventoryItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onPress={() => openHistory(item.id)}
                  onAction={(transactionType) =>
                    openTransactionModal(item, transactionType)
                  }
                />
              ))}
              {inventoryItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>
                    No inventory items found
                  </Text>
                  <Text style={styles.emptyStateText}>
                    Try a different search or category filter.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <SectionHeader
              title="Transactions"
              subtitle="Recent stock movements from the floor."
            />
            <View style={{ gap: 10 }}>
              {recentTransactions.map((transaction) => (
                <Pressable
                  key={transaction.id}
                  style={styles.transactionCard}
                  onPress={() => openHistory(transaction.inventoryItemId)}
                >
                  <TransactionRow transaction={transaction} />
                </Pressable>
              ))}
              {recentTransactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>
                    No transactions yet
                  </Text>
                  <Text style={styles.emptyStateText}>
                    Create a stock movement from an inventory item.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  screen: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fafafa",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#a1a1aa",
    marginTop: 2,
  },
  refreshButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#111113",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButtonText: {
    color: "#fafafa",
    fontSize: 13,
    fontWeight: "700",
  },
  banner: {
    backgroundColor: "#111113",
    borderColor: "#27272a",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  bannerTitle: {
    color: "#fafafa",
    fontSize: 18,
    fontWeight: "700",
  },
  bannerText: {
    color: "#d4d4d8",
    fontSize: 14,
    lineHeight: 20,
  },
  bannerMeta: {
    color: "#71717a",
    fontSize: 12,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#111113",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#e4e4e7",
    borderColor: "#e4e4e7",
  },
  chipText: {
    color: "#d4d4d8",
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#09090b",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#111113",
    borderColor: "#27272a",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  statPill: {
    width: 36,
    height: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgeHealthy: {
    backgroundColor: "#22c55e",
  },
  badgeWarning: {
    backgroundColor: "#f59e0b",
  },
  badgeCritical: {
    backgroundColor: "#ef4444",
  },
  statLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: {
    color: "#fafafa",
    fontSize: 22,
    fontWeight: "800",
  },
  statDescription: {
    color: "#71717a",
    fontSize: 12,
    lineHeight: 16,
  },
  loadingBlock: {
    paddingVertical: 12,
    alignItems: "center",
    gap: 10,
  },
  errorBlock: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#7f1d1d",
    backgroundColor: "rgba(127, 29, 29, 0.25)",
    padding: 14,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: "#fafafa",
    fontSize: 17,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 18,
  },
  searchBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#111113",
  },
  searchInput: {
    color: "#fafafa",
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  filterRow: {
    paddingRight: 8,
  },
  itemCard: {
    backgroundColor: "#111113",
    borderColor: "#27272a",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  itemTitle: {
    color: "#fafafa",
    fontSize: 17,
    fontWeight: "800",
  },
  itemSubtitle: {
    color: "#a1a1aa",
    fontSize: 12,
    marginTop: 2,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stockBadgeText: {
    color: "#09090b",
    fontSize: 11,
    fontWeight: "800",
  },
  itemMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  itemMetaLabel: {
    color: "#71717a",
    fontSize: 12,
  },
  itemMetaValue: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },
  itemActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionButtonPrimary: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  actionButtonSecondary: {
    backgroundColor: "#18181b",
    borderColor: "#3f3f46",
  },
  actionButtonGhost: {
    backgroundColor: "transparent",
    borderColor: "#3f3f46",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  actionButtonTextPrimary: {
    color: "#ffffff",
  },
  actionButtonTextSecondary: {
    color: "#fafafa",
  },
  actionButtonTextGhost: {
    color: "#d4d4d8",
  },
  transactionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#111113",
    padding: 14,
  },
  transactionRow: {
    gap: 6,
  },
  transactionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  transactionItemName: {
    color: "#fafafa",
    fontSize: 15,
    fontWeight: "800",
  },
  transactionMeta: {
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 16,
  },
  transactionReason: {
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#111113",
    padding: 18,
    alignItems: "center",
    gap: 6,
  },
  emptyStateTitle: {
    color: "#fafafa",
    fontSize: 15,
    fontWeight: "800",
  },
  emptyStateText: {
    color: "#a1a1aa",
    fontSize: 13,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#09090b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#27272a",
    padding: 16,
    maxHeight: "88%",
  },
  modalCardLarge: {
    backgroundColor: "#09090b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#27272a",
    padding: 16,
    maxHeight: "92%",
  },
  modalTitle: {
    color: "#fafafa",
    fontSize: 20,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: "#a1a1aa",
    fontSize: 13,
    marginTop: 2,
  },
  modalField: {
    gap: 8,
  },
  modalFieldLabel: {
    color: "#d4d4d8",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#111113",
    color: "#fafafa",
    paddingHorizontal: 14,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  inlineRow: {
    flexDirection: "row",
    gap: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalSaveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  centeredBlock: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailTile: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#111113",
    padding: 12,
    gap: 6,
  },
  detailValue: {
    color: "#fafafa",
    fontSize: 14,
    fontWeight: "800",
  },
  qrCodeValue: {
    color: "#d4d4d8",
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: "#111113",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 12,
  },
  historyRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#111113",
    padding: 12,
    gap: 4,
  },
  closeButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  closeButtonText: {
    color: "#fafafa",
    fontSize: 14,
    fontWeight: "800",
  },
});
