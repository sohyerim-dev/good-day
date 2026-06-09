interface DaumPostcodeData {
  roadAddress: string;
  address: string;
}

interface DaumPostcodeInstance {
  open(): void;
}

interface DaumPostcodeConstructor {
  new (options: { oncomplete: (data: DaumPostcodeData) => void }): DaumPostcodeInstance;
}

interface Window {
  daum: {
    Postcode: DaumPostcodeConstructor;
  };
}
