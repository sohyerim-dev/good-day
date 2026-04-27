export interface TransitStep {
  travelMode?: string;
  staticDuration?: string;
  transitDetails?: {
    transitLine?: {
      name?: string;
      nameShort?: string;
      vehicle?: { type?: string };
    };
    stopDetails?: {
      departureStop?: { name?: string };
      arrivalStop?: { name?: string };
    };
  };
}

export interface RouteSegment {
  duration: string;
  steps: TransitStep[];
  walkDuration?: string;
}
