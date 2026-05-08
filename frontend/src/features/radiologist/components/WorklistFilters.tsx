import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Search,
    Filter,
    Activity,
    Clock,
    User,
    CheckCircle2
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WorklistFiltersProps {
    onSearchChange: (value: string) => void;
    onModalityChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onUrgencyChange: (value: string) => void;
    searchQuery: string;
    filterModality: string;
    filterStatus: string;
    filterUrgency: string;
}

export function WorklistFilters({
    onSearchChange,
    onModalityChange,
    onStatusChange,
    onUrgencyChange,
    searchQuery,
    filterModality,
    filterStatus,
    filterUrgency
}: WorklistFiltersProps) {
    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                    <div className="relative flex-1 max-w-lg">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search Patient Name, MRN or Accession..."
                            className="pl-10 h-11 bg-muted/20 border-border rounded-xl focus:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="h-11 px-4 rounded-xl border-indigo-200 bg-indigo-50 text-indigo-600 gap-2 flex items-center">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Auto-Refresh: 30s</span>
                    </Badge>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 py-1">
                <Select value={filterModality} onValueChange={onModalityChange}>
                    <SelectTrigger className="w-[160px] h-10 rounded-xl bg-background border-border text-[11px] font-bold">
                        <Activity className="w-4 h-4 mr-2 text-indigo-500" />
                        <SelectValue placeholder="Modality" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Modalities</SelectItem>
                        <SelectItem value="CT">CT Scan</SelectItem>
                        <SelectItem value="MRI">MRI Scan</SelectItem>
                        <SelectItem value="XRAY">X-Ray</SelectItem>
                        <SelectItem value="US">Ultrasound</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={onStatusChange}>
                    <SelectTrigger className="w-[160px] h-10 rounded-xl bg-background border-border text-[11px] font-bold">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Every Status</SelectItem>
                        <SelectItem value="Pending">Pending Assignment</SelectItem>
                        <SelectItem value="Accepted">Accepted / Active</SelectItem>
                        <SelectItem value="Reported">Reported</SelectItem>
                    </SelectContent>
                </Select>

                <div className="h-6 w-px bg-border mx-1" />

                <div className="flex items-center bg-muted/20 rounded-xl p-1 border">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUrgencyChange('all')}
                        className={cn(
                            "h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            filterUrgency === 'all' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        All Cases
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUrgencyChange('STAT')}
                        className={cn(
                            "h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ml-1",
                            filterUrgency === 'STAT' ? "bg-background shadow-sm text-red-600" : "text-muted-foreground hover:text-foreground hover:text-red-500"
                        )}
                    >
                        Only STAT
                    </Button>
                </div>
            </div>
        </div>
    );
}
