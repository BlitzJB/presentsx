import { firestore } from '@/lib/firebase'
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy, limit, or, and, documentId } from 'firebase/firestore'

export type TSlide = {
    id: string
    code: string
}

export type TPresentation = {
    id: string
    userId: string
    title: string
    description: string
    slides: TSlide[]
    createdAt: Date
    updatedAt: Date
    lastTouchedAt: Date
    public: boolean
}

export class PresentationService {
    private collection = 'presentations'

    async createPresentation(userId: string, title: string, description: string, isPublic: boolean = false): Promise<TPresentation> {
        const newPresentationRef = doc(collection(firestore, this.collection))
        const now = new Date()
        const newPresentation: Omit<TPresentation, 'id'> = {
            userId,
            title,
            description,
            slides: [],
            createdAt: now,
            updatedAt: now,
            lastTouchedAt: now,
            public: isPublic,
        }

        await setDoc(newPresentationRef, newPresentation)
        return { id: newPresentationRef.id, ...newPresentation }
    }

    async getAccessiblePresentation(presentationId: string, userId: string): Promise<TPresentation | null> {
        const querySnapshot = await getDocs(query(
            collection(firestore, this.collection),
            and(
                where(documentId(), "==", presentationId),
                or(
                    where("userId", "==", userId),
                    where("public", "==", true)
                )
            )
        ))

        if (querySnapshot.empty) {
            return null;
        }

        const docSnap = querySnapshot.docs[0]

        if (!docSnap.exists()) {
            return null;
        }

        const presentation = docSnap.data() as TPresentation

        if (presentation.userId === userId || presentation.public) {
            // @ts-ignore
            return { id: docSnap.id, ...presentation } as TPresentation
        }

        return null;
    }

    async getPresentation(presentationId: string): Promise<TPresentation | null> {
        const docRef = doc(firestore, this.collection, presentationId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as TPresentation
        } else {
            return null
        }
    }

    async updatePresentation(presentationId: string, data: Partial<Omit<TPresentation, 'id'>>): Promise<void> {
        const docRef = doc(firestore, this.collection, presentationId)
        await updateDoc(docRef, { ...data, updatedAt: new Date() })
    }

    async deletePresentation(presentationId: string): Promise<void> {
        const docRef = doc(firestore, this.collection, presentationId)
        await deleteDoc(docRef)
    }

    async getUserPresentations(userId: string): Promise<TPresentation[]> {
        const q = query(collection(firestore, this.collection), where("userId", "==", userId))
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TPresentation))
    }

    async renamePresentation(presentationId: string, newTitle: string): Promise<void> {
        await this.updatePresentation(presentationId, { title: newTitle })
    }

    async updateSlides(presentationId: string, slides: TSlide[]): Promise<void> {
        await this.updatePresentation(presentationId, { slides })
    }

    async addSlide(presentationId: string, slide: TSlide): Promise<void> {
        const presentation = await this.getPresentation(presentationId)
        if (presentation) {
            const updatedSlides = [...presentation.slides, slide]
            await this.updateSlides(presentationId, updatedSlides)
        }
    }

    async removeSlide(presentationId: string, slideId: string): Promise<void> {
        const presentation = await this.getPresentation(presentationId)
        if (presentation) {
            const updatedSlides = presentation.slides.filter(slide => slide.id !== slideId)
            await this.updateSlides(presentationId, updatedSlides)
            await this.updateTouched(presentationId)
        }
    }

    async updateSlide(presentationId: string, slideId: string, updatedSlide: Partial<TSlide>): Promise<void> {
        const presentation = await this.getPresentation(presentationId)
        if (presentation) {
            const updatedSlides = presentation.slides.map(slide =>
                slide.id === slideId ? { ...slide, ...updatedSlide } : slide
            )
            await this.updateSlides(presentationId, updatedSlides)
        }
    }

    async setPublicStatus(presentationId: string, isPublic: boolean): Promise<void> {
        await this.updatePresentation(presentationId, { public: isPublic })
    }

    async updateTouched(presentationId: string): Promise<void> {
        const docRef = doc(firestore, this.collection, presentationId)
        await updateDoc(docRef, { lastTouchedAt: new Date() })
    }

    async getRecentPresentations(userId: string, limit_: number = 5): Promise<TPresentation[]> {
        const q = query(
            collection(firestore, this.collection),
            where("userId", "==", userId),
            orderBy("lastTouchedAt", "desc"),
            limit(limit_)
        )
        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TPresentation))
    }
}
