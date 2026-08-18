class CategoryReservations {
    private counts = new Map<string, number>();

    reserve(categoryId: string): void {
        this.counts.set(categoryId, (this.counts.get(categoryId) ?? 0) + 1);
    }

    release(categoryId: string): void {
        const current = this.counts.get(categoryId) ?? 0;
        if (current <= 1) {
            this.counts.delete(categoryId);
        } else {
            this.counts.set(categoryId, current - 1);
        }
    }

    get(categoryId: string): number {
        return this.counts.get(categoryId) ?? 0;
    }
}

export const category_reservations = new CategoryReservations();