import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Village {
  id: string;
  name: string;
  district: string;
  state: string;
}

interface VillageSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const VillageSelector = ({ 
  value, 
  onValueChange, 
  placeholder = "Select village...",
  disabled = false 
}: VillageSelectorProps) => {
  const [villages, setVillages] = useState<Village[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadVillages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/.netlify/functions/villages');
        const result = await response.json();
        if (response.ok && result.villages) {
          setVillages(result.villages);
        }
      } catch (error) {
        console.error('Failed to load villages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVillages();
  }, []);

  const selectedVillage = villages.find((village) => village.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {selectedVillage
            ? `${selectedVillage.name}, ${selectedVillage.district}, ${selectedVillage.state}`
            : isLoading 
              ? "Loading villages..."
              : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Search villages..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>
            {isLoading ? "Loading villages..." : "No village found."}
          </CommandEmpty>
          <CommandGroup>
            <CommandList>
              {villages
                .filter((village) =>
                  village.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                  village.district.toLowerCase().includes(searchValue.toLowerCase()) ||
                  village.state.toLowerCase().includes(searchValue.toLowerCase())
                )
                .map((village) => (
                  <CommandItem
                    key={village.id}
                    value={village.id}
                    onSelect={() => {
                      onValueChange(village.id);
                      setSearchValue("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === village.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {village.name}, {village.district}, {village.state}
                  </CommandItem>
                ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
