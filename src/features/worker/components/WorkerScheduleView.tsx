
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCreaoAuth } from "@/sdk/core/auth";
import { WorkerScheduleORM, type WorkerScheduleModel } from "@/sdk/database/orm/orm_worker_schedule";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function WorkerScheduleView() {
    const { user, companyId } = useCreaoAuth();
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Month navigation for fetching range
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    const { data: schedules = [], isLoading } = useQuery({
        queryKey: ["worker-schedules", user?.uid, format(currentMonth, "yyyy-MM")],
        enabled: !!user?.uid,
        queryFn: async () => {
            if (!user?.uid) return [];
            const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
            const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
            return await WorkerScheduleORM.getInstance().getSchedulesByWorkerAndDateRange(user.uid, start, end);
        }
    });

    const createScheduleMutation = useMutation({
        mutationFn: async (data: Partial<WorkerScheduleModel>) => {
            if (!user?.uid || !companyId) throw new Error("Missing user info");
            return await WorkerScheduleORM.getInstance().setSchedule({
                ...data,
                worker_id: user.uid,
                company_id: companyId,
                create_time: new Date().toISOString(),
                update_time: new Date().toISOString(),
                is_available: true // Default to true if setting schedule
            } as WorkerScheduleModel);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["worker-schedules"] });
            setIsDialogOpen(false);
        }
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: async (id: string) => {
            return await WorkerScheduleORM.getInstance().deleteSchedule(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["worker-schedules"] });
        }
    });

    const handleMonthChange = (month: Date) => {
        setCurrentMonth(month);
    };

    // Helper to find schedule for a specific date
    const getScheduleForDate = (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        return schedules.find(s => s.date === dateStr);
    };

    const handleAddAvailability = () => {
        if (!selectedDate) return;
        const dateStr = format(selectedDate, "yyyy-MM-dd");

        // Check if exists
        const existing = getScheduleForDate(selectedDate);
        if (existing) {
            // Edit mode? For now just create new one implies overwriting logic isn't built yet, 
            // but ORM setSchedule handles update if ID is provided.
            // Here we probably just want to open dialog to add details.
        }
        setIsDialogOpen(true);
    };

    const [formData, setFormData] = useState({
        start_time: "09:00",
        end_time: "17:00",
        notes: ""
    });

    const handleSubmit = () => {
        if (!selectedDate) return;

        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const existing = getScheduleForDate(selectedDate);

        createScheduleMutation.mutate({
            id: existing?.id, // Update if exists
            date: dateStr,
            start_time: formData.start_time,
            end_time: formData.end_time,
            notes: formData.notes,
            is_available: true
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>My Availability</CardTitle>
                    <CardDescription>Select a date to set your availability.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        onMonthChange={handleMonthChange}
                        className="rounded-md border"
                        modifiers={{
                            booked: (date) => {
                                const s = getScheduleForDate(date);
                                return !!s && s.is_available;
                            }
                        }}
                        modifiersStyles={{
                            booked: { fontWeight: 'bold', textDecoration: 'underline', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%' }
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {selectedDate ? (
                        <div className="space-y-4">
                            {(() => {
                                const schedule = getScheduleForDate(selectedDate);
                                if (schedule) {
                                    return (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                                                <div>
                                                    <div className="font-semibold text-green-700">Available</div>
                                                    <div className="text-sm text-green-600">
                                                        {schedule.start_time} - {schedule.end_time}
                                                    </div>
                                                    {schedule.notes && <div className="text-xs text-muted-foreground mt-1">{schedule.notes}</div>}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <Button variant="outline" className="w-full" onClick={() => setIsDialogOpen(true)}>
                                                Edit Availability
                                            </Button>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="text-center py-8">
                                            <p className="text-muted-foreground mb-4">No availability set for this date.</p>
                                            <Button onClick={() => setIsDialogOpen(true)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Set Availability
                                            </Button>
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            Please select a date from the calendar.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Availability</DialogTitle>
                        <DialogDescription>
                            {selectedDate && format(selectedDate, "PPP")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start">Start Time</Label>
                                <Input
                                    id="start"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end">End Time</Label>
                                <Input
                                    id="end"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Input
                                id="notes"
                                placeholder="e.g. Prefer morning"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={createScheduleMutation.isPending}>
                            {createScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
