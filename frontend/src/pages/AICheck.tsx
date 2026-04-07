import { SymptomChecker } from '@/components/symptom-checker'

export default function AiCheckPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">AI Health Assistant ✨</h2>
                <p className="text-muted-foreground">Describe your symptoms to get instant, locally-processed health advice.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-12">
                    <SymptomChecker />
                </div>
            </div>
        </div>
    )
}
