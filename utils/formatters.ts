export const formatCurrency = (amount: number | undefined | null, currency: string = 'USD'): string => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};
