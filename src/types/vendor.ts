export type VendorStatus = 'pending' | 'verified' | 'suspended'


export interface VendorDoc {
id: string
displayName: string
city?: string
districts?: string[]
skills?: string[]
phone?: string
photoURL?: string
rating?: number
isPro?: boolean
status: VendorStatus
createdAt?: any // Firestore Timestamp
}