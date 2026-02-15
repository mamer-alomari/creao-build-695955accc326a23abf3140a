/**
 * Room-by-Room Inventory Component
 *
 * Uses GPT Vision to detect items from room photos and allows customers
 * to select/modify items for their moving quote.
 */

import * as React from "react";
import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  Upload,
  Loader2,
  Package,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  X,
  Sparkles,
  Box,
} from "lucide-react";
import {
  useAnalyzeRoomImage,
  fileToDataUrl,
  ROOM_TYPES,
  ITEM_CATEGORIES,
  type DetectedItem,
  type RoomInventory,
} from "@/hooks/use-google-vision";

interface RoomInventoryProps {
  onInventoryChange?: (rooms: RoomInventory[]) => void;
  initialRooms?: RoomInventory[];
  readOnly?: boolean;
}

/**
 * Main Room Inventory Component
 */
export function RoomInventoryManager({ onInventoryChange, initialRooms = [], readOnly = false }: RoomInventoryProps) {
  const [rooms, setRooms] = useState<RoomInventory[]>(initialRooms);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(null);

  const handleAddRoom = (room: RoomInventory) => {
    const newRooms = [...rooms, room];
    setRooms(newRooms);
    onInventoryChange?.(newRooms);
    setIsAddRoomOpen(false);
  };

  const handleUpdateRoom = (index: number, room: RoomInventory) => {
    const newRooms = [...rooms];
    newRooms[index] = room;
    setRooms(newRooms);
    onInventoryChange?.(newRooms);
  };

  const handleDeleteRoom = (index: number) => {
    const newRooms = rooms.filter((_, i) => i !== index);
    setRooms(newRooms);
    onInventoryChange?.(newRooms);
    if (selectedRoomIndex === index) {
      setSelectedRoomIndex(null);
    }
  };

  const totalItems = rooms.reduce((sum, room) => sum + room.items.length, 0);
  const totalSelectedItems = rooms.reduce(
    (sum, room) => sum + room.items.filter((item) => item.quantity > 0).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Room-by-Room Inventory
              </CardTitle>
              <CardDescription>
                Take photos of each room and our AI will identify items to be moved
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddRoomOpen(true)} disabled={readOnly} className={readOnly ? "hidden" : ""}>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{rooms.length}</div>
              <div className="text-sm text-muted-foreground">Rooms</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{totalItems}</div>
              <div className="text-sm text-muted-foreground">Items Detected</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{totalSelectedItems}</div>
              <div className="text-sm text-muted-foreground">Items Selected</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Cards */}
      {rooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No rooms added yet</h3>
            <p className="text-muted-foreground mb-4">
              {readOnly ? "No inventory available for this quote." : "Start by adding a room and uploading a photo. Our AI will detect items automatically."}
            </p>
            {!readOnly && (
              <Button onClick={() => setIsAddRoomOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Room
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, index) => (
            <RoomCard
              key={`${room.roomName}-${index}`}
              room={room}
              onEdit={() => setSelectedRoomIndex(index)}
              onDelete={() => handleDeleteRoom(index)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* Add Room Dialog */}
      <AddRoomDialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen} onAdd={handleAddRoom} />

      {/* Edit Room Dialog */}
      {selectedRoomIndex !== null && (
        <EditRoomDialog
          open={selectedRoomIndex !== null}
          onOpenChange={(open) => !open && setSelectedRoomIndex(null)}
          room={rooms[selectedRoomIndex]}
          onSave={(room) => {
            handleUpdateRoom(selectedRoomIndex, room);
            setSelectedRoomIndex(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Room Card Component
 */
function RoomCard({
  room,
  onEdit,
  onDelete,
  readOnly,
}: {
  room: RoomInventory;
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const selectedItems = room.items.filter((item) => item.quantity > 0);
  const roomTypeLabel = ROOM_TYPES.find((t) => t.value === room.roomType)?.label || room.roomType;

  return (
    <Card className="overflow-hidden">
      {room.imageUrl && (
        <div className="aspect-video bg-muted relative">
          <img
            src={room.imageUrl}
            alt={room.roomName}
            className="w-full h-full object-cover"
          />
          <Badge className="absolute top-2 right-2" variant="secondary">
            {roomTypeLabel}
          </Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{room.roomName}</CardTitle>
          {!readOnly && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selectedItems.length} of {room.items.length} items selected
          </span>
          {!readOnly && (
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={onEdit}>
              View Details
            </Button>
          )}
        </div>
        {selectedItems.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedItems.slice(0, 3).map((item) => (
              <Badge key={item.id} variant="outline" className="text-xs">
                {item.name}
              </Badge>
            ))}
            {selectedItems.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{selectedItems.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Add Room Dialog
 */
function AddRoomDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (room: RoomInventory) => void;
}) {
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [step, setStep] = useState<"upload" | "analyzing" | "select">("upload");
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = useAnalyzeRoomImage();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const preview = await fileToDataUrl(file);
      setImagePreview(preview);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !roomType) {
      setError("Please select a room type and upload an image");
      return;
    }

    setStep("analyzing");
    setError(null);

    try {
      const items = await analyzeImage.mutateAsync({
        imageFile,
        roomType,
      });
      setDetectedItems(items);
      setStep("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
      setStep("upload");
    }
  };

  const handleAddRoom = () => {
    const selectedItems = detectedItems.filter((item) => item.quantity > 0);
    const room: RoomInventory = {
      roomName: roomName || ROOM_TYPES.find((t) => t.value === roomType)?.label || "Room",
      roomType,
      imageUrl: imagePreview || undefined,
      items: selectedItems,
      totalItems: selectedItems.length,
      analyzedAt: new Date().toISOString(),
    };
    onAdd(room);
    resetForm();
  };

  const resetForm = () => {
    setRoomName("");
    setRoomType("");
    setImageFile(null);
    setImagePreview(null);
    setDetectedItems([]);
    setStep("upload");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "upload" && (
              <>
                <Camera className="h-5 w-5" />
                Add Room
              </>
            )}
            {step === "analyzing" && (
              <>
                <Sparkles className="h-5 w-5" />
                Analyzing Image...
              </>
            )}
            {step === "select" && (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Select Items to Move
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a photo of the room and our AI will detect items"}
            {step === "analyzing" && "Please wait while we identify items in your photo"}
            {step === "select" && `Found ${detectedItems.length} items. Select the ones you want to move.`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roomType">Room Type</Label>
                  <Select value={roomType} onValueChange={setRoomType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomName">Room Name (Optional)</Label>
                  <Input
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g., Master Bedroom"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Room Photo</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Room preview"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-12 w-12" />
                        <span className="font-medium">Click to upload a photo</span>
                        <span className="text-sm">or drag and drop</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Identifying items in your room...</p>
              <p className="text-sm text-muted-foreground mt-2">This usually takes 10-30 seconds</p>
            </div>
          )}

          {step === "select" && (
            <ScrollArea className="h-[400px] pr-4">
              <ItemSelectionList
                items={detectedItems}
                onItemsChange={setDetectedItems}
              />
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleAnalyze} disabled={!imageFile || !roomType}>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Room
              </Button>
            </>
          )}
          {step === "select" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleAddRoom}>
                <Plus className="h-4 w-4 mr-2" />
                Add Room ({detectedItems.filter((i) => i.quantity > 0).length} items)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Edit Room Dialog
 */
function EditRoomDialog({
  open,
  onOpenChange,
  room,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RoomInventory;
  onSave: (room: RoomInventory) => void;
}) {
  const [items, setItems] = useState<DetectedItem[]>(room.items);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const handleSave = () => {
    onSave({
      ...room,
      items: items.filter((item) => item.quantity > 0),
      totalItems: items.filter((item) => item.quantity > 0).length,
    });
  };

  const handleAddManualItem = (item: DetectedItem) => {
    setItems([...items, item]);
    setIsAddingItem(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit {room.roomName}
          </DialogTitle>
          <DialogDescription>
            Review and modify the items detected in this room
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {room.imageUrl && (
            <div className="w-1/3 flex-shrink-0">
              <img
                src={room.imageUrl}
                alt={room.roomName}
                className="w-full rounded-lg object-cover"
              />
            </div>
          )}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {items.filter((i) => i.quantity > 0).length} items selected
                </span>
                <Button variant="outline" size="sm" onClick={() => setIsAddingItem(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item Manually
                </Button>
              </div>
              <ItemSelectionList items={items} onItemsChange={setItems} />
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>

        {isAddingItem && (
          <AddManualItemDialog
            open={isAddingItem}
            onOpenChange={setIsAddingItem}
            onAdd={handleAddManualItem}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Item Selection List Component
 */
function ItemSelectionList({
  items,
  onItemsChange,
}: {
  items: DetectedItem[];
  onItemsChange: (items: DetectedItem[]) => void;
}) {
  const handleToggleItem = (itemId: string) => {
    onItemsChange(
      items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: item.quantity > 0 ? 0 : 1 }
          : item
      )
    );
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    onItemsChange(
      items.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(0, quantity) } : item
      )
    );
  };

  const handleDeleteItem = (itemId: string) => {
    onItemsChange(items.filter((item) => item.id !== itemId));
  };

  const groupedItems = items.reduce(
    (acc, item) => {
      const category = item.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, DetectedItem[]>
  );

  return (
    <div className="space-y-4">
      {Object.entries(groupedItems).map(([category, categoryItems]) => {
        const categoryLabel =
          ITEM_CATEGORIES.find((c) => c.value === category)?.label || category;
        return (
          <div key={category}>
            <h4 className="font-medium mb-2 capitalize">{categoryLabel}</h4>
            <div className="space-y-2">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${item.quantity > 0 ? "bg-primary/5 border-primary/20" : "bg-muted/50"
                    }`}
                >
                  <Checkbox
                    checked={item.quantity > 0}
                    onCheckedChange={() => handleToggleItem(item.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.fragile && (
                        <Badge variant="destructive" className="text-xs">
                          Fragile
                        </Badge>
                      )}
                      {item.estimatedSize && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.estimatedSize}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                    {item.specialHandling && (
                      <p className="text-xs text-amber-600 mt-1">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {item.specialHandling}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`qty-${item.id}`} className="text-sm text-muted-foreground">
                      Qty:
                    </Label>
                    <Input
                      id={`qty-${item.id}`}
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                      className="w-16 text-center"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="mt-4" />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Add Manual Item Dialog
 */
function AddManualItemDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: DetectedItem) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DetectedItem["category"]>("other");
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState<"small" | "medium" | "large" | "extra-large">("medium");
  const [fragile, setFragile] = useState(false);
  const [specialHandling, setSpecialHandling] = useState("");

  const handleAdd = () => {
    const item: DetectedItem = {
      id: `manual-${Date.now()}`,
      name,
      category,
      quantity,
      estimatedSize: size,
      fragile,
      specialHandling: specialHandling || undefined,
    };
    onAdd(item);
    // Reset form
    setName("");
    setCategory("other");
    setQuantity(1);
    setSize("medium");
    setFragile(false);
    setSpecialHandling("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Add Item Manually
          </DialogTitle>
          <DialogDescription>
            Add an item that wasn't detected in the photo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name</Label>
            <Input
              id="itemName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Floor Lamp"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(val) => setCategory(val as DetectedItem["category"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">Estimated Size</Label>
            <Select value={size} onValueChange={(v) => setSize(v as typeof size)}>
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (fits in a box)</SelectItem>
                <SelectItem value="medium">Medium (needs 2 people)</SelectItem>
                <SelectItem value="large">Large (needs 3+ people)</SelectItem>
                <SelectItem value="extra-large">Extra Large (special equipment)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="fragile"
              checked={fragile}
              onCheckedChange={(checked) => setFragile(checked === true)}
            />
            <Label htmlFor="fragile">This item is fragile</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialHandling">Special Handling Notes (Optional)</Label>
            <Input
              id="specialHandling"
              value={specialHandling}
              onChange={(e) => setSpecialHandling(e.target.value)}
              placeholder="e.g., Keep upright, disassembly required"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!name}>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RoomInventoryManager;
