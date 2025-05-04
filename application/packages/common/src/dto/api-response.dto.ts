export class ApiResponse<T> {
    data: T | null;

    constructor(data: T | null) {
        this.data = data;
    }
} 