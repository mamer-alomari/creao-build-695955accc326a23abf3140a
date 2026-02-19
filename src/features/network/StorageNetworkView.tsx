
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useCreaoAuth } from "@/sdk/core/auth";
import { StorageFacilityORM, type StorageFacilityModel } from "@/sdk/database/orm/orm_storage_facility";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Phone, MapPin, Globe, Star, Trash2, Plus, Search, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGoogleMaps } from "@/hooks/use-google-maps";

declare var google: any;

export function StorageNetworkView() {
    const { companyId } = useCreaoAuth();
    const queryClient = useQueryClient();
    const { isLoaded } = useGoogleMaps();

    // State for searching
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Saved Facilities
    const { data: facilities = [], isLoading } = useQuery({
        queryKey: ["storage-facilities", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            return await StorageFacilityORM.getInstance().getFacilitiesByCompanyId(companyId);
        },
        enabled: !!companyId
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await StorageFacilityORM.getInstance().deleteFacility(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["storage-facilities"] });
        }
    });

    const addMutation = useMutation({
        mutationFn: async (place: any) => {
            if (!companyId) throw new Error("No company ID");

            // Map Google Place to StorageFacilityModel
            const facility: Partial<StorageFacilityModel> = {
                company_id: companyId,
                name: place.name || "Unknown Storage",
                address: place.formatted_address || place.vicinity || "No address provided",
                google_place_id: place.place_id,
                rating: place.rating || null,
                user_ratings_total: place.user_ratings_total || null,
                location: place.geometry?.location ? {
                    lat: typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat,
                    lng: typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng
                } : undefined
            };

            // Remove undefined keys
            Object.keys(facility).forEach(key => {
                if ((facility as any)[key] === undefined) {
                    delete (facility as any)[key];
                }
            });

            // Try to get more details if possible (phone, website)
            // Ideally we'd do a Place Details call here, but for now we use what Search returns 
            // or just save it. Detailed info might require another fetch.

            return await StorageFacilityORM.getInstance().insertFacility(facility as any);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["storage-facilities"] });
            setIsAddDialogOpen(false);
            setSearchQuery("");
            setSearchResults([]);
        },
        onError: (error) => {
            console.error("Failed to add storage facility:", error);
            toast.error(`Failed to add storage facility: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    });

    // Search Logic using Google Places Service
    const handleSearch = (query: string) => {
        setSearchQuery(query);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (!query.trim() || !isLoaded) {
            setSearchResults([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(() => {
            setIsSearching(true);
            const service = new google.maps.places.PlacesService(document.createElement('div'));

            const request = {
                query: `self storage ${query}`,
                fields: ['name', 'geometry', 'formatted_address', 'place_id', 'rating', 'user_ratings_total']
            };

            service.textSearch(request, (results: any[] | null, status: any) => {
                setIsSearching(false);
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    const formattedResults = results.map((r: any) => ({
                        id: r.place_id || Math.random().toString(),
                        name: r.name || "Unknown",
                        address: r.formatted_address || "Unknown Address",
                        rating: r.rating,
                        user_ratings_total: r.user_ratings_total,
                    }));
                    setSearchResults(formattedResults);
                } else {
                    setSearchResults([]);
                }
            });
        }, 500);
    };

    return (
        <Card className="h-full flex flex-col border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Storage Network</CardTitle>
                        <CardDescription>Manage your partner storage facilities.</CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Facility
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Add Storage Facility</DialogTitle>
                                <DialogDescription>Search for storage facilities to add to your network.</DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                                <div className="space-y-2">
                                    <Label>Search Area / Name</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="e.g. Dallas, TX or CubeSmart"
                                            className="pl-9"
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto border rounded-md">
                                    {isSearching ? (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                            Searching...
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="divide-y">
                                            {searchResults.map((place) => (
                                                <div key={place.place_id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                                                    <div>
                                                        <div className="font-medium">{place.name}</div>
                                                        <div className="text-sm text-muted-foreground">{place.formatted_address}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex items-center text-xs text-yellow-600">
                                                                <Star className="h-3 w-3 fill-current mr-1" />
                                                                {place.rating} ({place.user_ratings_total})
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => addMutation.mutate(place)}
                                                        disabled={addMutation.isPending}
                                                    >
                                                        {addMutation.isPending ? "Adding..." : "Add"}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : searchQuery ? (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            No results found.
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            Type to search for storage facilities.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto px-0">
                {isLoading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : facilities.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-card">
                        <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No storage facilities.</h3>
                        <p className="text-muted-foreground">Search and add facilities to build your network.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {facilities.map((facility) => (
                            <Card key={facility.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base truncate pr-2">{facility.name}</CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => deleteMutation.mutate(facility.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        <span className="truncate">{facility.address}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-sm space-y-2">
                                    {facility.rating && (
                                        <div className="flex items-center">
                                            <Star className="h-3 w-3 text-yellow-500 fill-current mr-2" />
                                            <span>{facility.rating} / 5</span>
                                            {facility.user_ratings_total && <span className="text-muted-foreground text-xs ml-1">({facility.user_ratings_total})</span>}
                                        </div>
                                    )}
                                    {facility.phone && (
                                        <div className="flex items-center">
                                            <Phone className="h-3 w-3 mr-2" />
                                            <span>{facility.phone}</span>
                                        </div>
                                    )}
                                    {facility.website && (
                                        <div className="flex items-center">
                                            <Globe className="h-3 w-3 mr-2" />
                                            <a href={facility.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block max-w-full">
                                                Website
                                            </a>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
