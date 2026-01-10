import { LocationDetails } from '../types';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const TIMEAPI_BASE_URL = 'https://timeapi.io/api/TimeZone/coordinate';

interface NominatimResult {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    address: {
        city?: string;
        town?: string;
        village?: string;
        hamlet?: string;
        suburb?: string;
        neighbourhood?: string;
        city_district?: string;
        municipality?: string;
        county?: string;
        state_district?: string;
        state?: string;
        region?: string;
        country?: string;
        country_code?: string;
    };
}

interface TimeApiResult {
    timeZone: string;
    currentUtcOffset: {
        seconds: number;
    };
    isDst: boolean;
}

export const searchLocation = async (query: string): Promise<LocationDetails[]> => {
    try {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: '1',
            limit: '5',
        });

        const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
            headers: {
                'User-Agent': 'AcademiaTrack/1.0'
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch location suggestions');
        }

        const results: NominatimResult[] = await response.json();

        // Map to LocationDetails (without timezone initially)
        return results.map((result): LocationDetails | null => {
            const city = getCityName(result.address);

            const state = result.address.state || result.address.region || '';
            const country = result.address.country || '';

            // Skip if we can't find a meaningful name
            if (!city && !state && !country) return null;

            return {
                city: city || state || country, // Fallback
                state,
                country,
                latitude: parseFloat(result.lat),
                longitude: parseFloat(result.lon),
                timezone: '', // To be fetched
                utcOffset: 0, // To be fetched
            };
        }).filter((loc): loc is LocationDetails => loc !== null);
    } catch (error) {
        console.error('Error searching location:', error);
        return [];
    }
};

export const getLocationTimezone = async (latitude: number, longitude: number): Promise<Partial<LocationDetails>> => {
    try {
        const params = new URLSearchParams({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
        });

        const response = await fetch(`${TIMEAPI_BASE_URL}?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to fetch timezone info');
        }

        const data: TimeApiResult = await response.json();

        return {
            timezone: data.timeZone,
            utcOffset: data.currentUtcOffset.seconds,
            dstActive: data.isDst,
        };
    } catch (error) {
        console.error('Error fetching timezone:', error);
        return {};
    }
};

const getCityName = (address: NominatimResult['address']): string => {
    return address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.suburb ||
        address.neighbourhood ||
        address.city_district ||
        address.municipality ||
        address.county ||
        address.state_district ||
        '';
};
