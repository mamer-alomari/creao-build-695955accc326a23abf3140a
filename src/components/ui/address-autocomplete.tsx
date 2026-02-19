
import { useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

declare global {
    interface Window {
        google: any;
    }
}

interface AddressAutocompleteProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
    value: string;
    onChange: (value: string) => void;
    onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
    label?: string;
}

export function AddressAutocomplete({
    value,
    onChange,
    onPlaceSelect,
    className,
    ...props
}: AddressAutocompleteProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const { isLoaded } = useGoogleMaps();

    // Internal state to manage input value while typing to allow freeform text
    const [inputValue, setInputValue] = useState(value);

    // Sync internal state with external value prop
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        if (!isLoaded || !inputRef.current || !window.google) return;

        // Initialize Autocomplete
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
            types: ["address"],
            fields: ["formatted_address", "geometry", "place_id"],
        });

        // Add listener for place selection
        autocompleteRef.current?.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace();

            if (place && place.formatted_address) {
                setInputValue(place.formatted_address);
                onChange(place.formatted_address);

                if (onPlaceSelect) {
                    onPlaceSelect(place);
                }
            }
        });

        // Cleanup
        return () => {
            if (window.google && window.google.maps && window.google.maps.event) {
                window.google.maps.event.clearInstanceListeners(autocompleteRef.current!);
            }
        };
    }, [isLoaded, onChange, onPlaceSelect]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        onChange(e.target.value);
    };

    return (
        <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
            <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleChange}
                className={cn("pl-9", className)}
                autoComplete="off"
                {...props}
            />
        </div>
    );
}
