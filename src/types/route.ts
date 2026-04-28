export interface TransitStep {
  travelMode?: string; // "WALK" 또는 "TRANSIT"
  staticDuration?: string; // 소요시간 (예: "720s")
  transitDetails?: {
    // 대중교통일 때만 있는 정보
    transitLine?: {
      name?: string; // "서울 간선버스"
      nameShort?: string; //272
      vehicle?: { type?: string }; // 차량 유형
    };
    stopDetails?: {
      departureStop?: { name?: string }; // 출발 정류장
      arrivalStop?: { name?: string }; // 도착 정류장
    };
  };
}

export interface RouteSegment {
  // 구간 전체 정보
  duration: string; // 교통수단 총 소요시간
  steps: TransitStep[]; // 위 TransitStep 배열
  walkDuration?: string; // 도보 소요시간
}
