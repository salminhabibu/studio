// src/components/features/youtube-downloader/DownloadOptionsPanel.tsx
"use client";

import { FormLabel } from "@/components/ui/form"; // Assuming FormLabel is used, or RadioGroup.Label etc.
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Assuming Format type is defined in a shared location or passed if complex
// For simplicity, if Format is complex and not easily shared, consider passing simplified props
// or ensure it's defined/imported in the consuming page component that prepares these props.
interface Format {
  itag: number;
  qualityLabel: string | null;
  container: string | null;
  fps?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  url?: string; 
  contentLength?: string;
  bitrate?: number | null;
  audioBitrate?: number | null;
}

interface DownloadOptionsPanelProps {
    selectedDownloadType: 'videoaudio' | 'videoonly' | 'audioonly';
    setSelectedDownloadType: (type: 'videoaudio' | 'videoonly' | 'audioonly') => void;
    videoFormatsToShow: Format[];
    selectedVideoItag: number | null;
    setSelectedVideoItag: (itag: number | null) => void;
    audioFormatsToShow: Format[];
    selectedAudioItag: number | null;
    setSelectedAudioItag: (itag: number | null) => void;
    selectedAudioFormat: 'm4a' | 'opus';
    setSelectedAudioFormat: (format: 'm4a' | 'opus') => void;
    sectionTitle?: string;
    dictionary: any; 
}

export function DownloadOptionsPanel({
    selectedDownloadType, setSelectedDownloadType,
    videoFormatsToShow, selectedVideoItag, setSelectedVideoItag,
    audioFormatsToShow, selectedAudioItag, setSelectedAudioItag,
    selectedAudioFormat, setSelectedAudioFormat, sectionTitle, dictionary
}: DownloadOptionsPanelProps) {

    const handleVideoItagChange = (value: string) => setSelectedVideoItag(value ? parseInt(value) : null);
    const handleAudioItagChange = (value: string) => setSelectedAudioItag(value ? parseInt(value) : null);

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-background/30">
            {sectionTitle && <h4 className="text-md font-semibold mb-3">{sectionTitle}</h4>}
            <div>
                <FormLabel className="text-base font-medium">{dictionary.downloadTypeLabel}</FormLabel>
                <RadioGroup value={selectedDownloadType} onValueChange={(value) => setSelectedDownloadType(value as any)} className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="videoaudio" id="type-va" /><label htmlFor="type-va" className="text-sm font-medium cursor-pointer">{dictionary.videoAudioLabel}</label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="videoonly" id="type-vo" /><label htmlFor="type-vo" className="text-sm font-medium cursor-pointer">{dictionary.videoOnlyLabel}</label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="audioonly" id="type-ao" /><label htmlFor="type-ao" className="text-sm font-medium cursor-pointer">{dictionary.audioOnlyLabel}</label></div>
                </RadioGroup>
            </div>

            {selectedDownloadType !== 'audioonly' && (
                <div>
                    <FormLabel htmlFor="video-quality-select" className="text-base font-medium">{dictionary.videoQualityLabel}</FormLabel>
                    <Select value={selectedVideoItag?.toString() || ""} onValueChange={handleVideoItagChange} name="video-quality-select" disabled={videoFormatsToShow.length === 0}>
                        <SelectTrigger className="h-11 mt-1" id="video-quality-select"><SelectValue placeholder={dictionary.selectVideoQualityPlaceholder} /></SelectTrigger>
                        <SelectContent>
                            {videoFormatsToShow.map((format) => (
                                <SelectItem key={`v-${format.itag}`} value={format.itag.toString()}>
                                    {format.qualityLabel || "N/A"} ({format.container || 'N/A'})
                                    {format.fps ? `, ${format.fps}fps` : ''}
                                    {format.hasAudio !== undefined ? `, Audio: ${format.hasAudio ? 'Yes' : 'No'}` : ''}
                                </SelectItem>
                            ))}
                            {videoFormatsToShow.length === 0 && <SelectItem value="disabled" disabled>{dictionary.noVideoFormats}</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {selectedDownloadType !== 'videoonly' && (
                <div>
                    <FormLabel htmlFor="audio-quality-select" className="text-base font-medium">{dictionary.audioQualityLabel}</FormLabel>
                    <Select value={selectedAudioItag?.toString() || ""} onValueChange={handleAudioItagChange} name="audio-quality-select" disabled={audioFormatsToShow.length === 0}>
                        <SelectTrigger className="h-11 mt-1" id="audio-quality-select"><SelectValue placeholder={dictionary.selectAudioQualityPlaceholder} /></SelectTrigger>
                        <SelectContent>
                            {audioFormatsToShow.map((format) => (
                                <SelectItem key={`a-${format.itag}`} value={format.itag.toString()}>
                                    {format.qualityLabel || `${format.audioBitrate || 'N/A'}kbps`} ({format.container || 'N/A'})
                                </SelectItem>
                            ))}
                            {audioFormatsToShow.length === 0 && <SelectItem value="disabled" disabled>{dictionary.noAudioFormats}</SelectItem>}
                        </SelectContent>
                    </Select>
                     <div className="mt-2">
                        <FormLabel className="text-sm font-medium text-muted-foreground">{dictionary.audioContainerPreferenceLabel || "Preferred Audio Container"}</FormLabel>
                         <RadioGroup value={selectedAudioFormat} onValueChange={(value) => setSelectedAudioFormat(value as 'm4a'|'opus')} className="flex gap-4 mt-1">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="m4a" id="format-m4a" /><label htmlFor="format-m4a" className="text-sm font-medium cursor-pointer">M4A (AAC)</label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="opus" id="format-opus" /><label htmlFor="format-opus" className="text-sm font-medium cursor-pointer">Opus</label></div>
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground mt-1">{dictionary.audioContainerNote}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
