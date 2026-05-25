'use client'

import { useState } from 'react'
import { addResource, deleteResource } from '@/features/resources/services/resource'
import Image from 'next/image'

interface Subject {
    id: number
    name: string
}

interface Resource {
    id: number
    title: string
    type: string
    url: string | null
    content: string | null
    subject: Subject
}

function getYoutubeEmbed(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11
        ? `https://www.youtube.com/embed/${match[2]}`
        : null
}

function getGoogleDrivePreview(url: string) {
    const match = url.match(/\/d\/(.*?)\//)
    if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`
    return null
}

const TYPE_META: Record<string, { icon: string; label: string; bg: string; text: string; border: string }> = {
    VIDEO:    { icon: '🎬', label: 'วิดีโอ',      bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200' },
    DOCUMENT: { icon: '📄', label: 'เอกสาร',      bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200' },
    LINK:     { icon: '🔗', label: 'ลิงก์ภายนอก', bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200' },
    NOTE:     { icon: '📝', label: 'โน้ตสรุป',    bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200' },
}

function ResourcePreview({ resource }: { resource: Resource }) {
    // VIDEO
    if (resource.type === 'VIDEO' && resource.url) {
        const embedUrl = getYoutubeEmbed(resource.url)
        if (embedUrl) {
            return (
                <div className="aspect-video rounded-2xl overflow-hidden mb-4 border border-stone-200">
                    <iframe src={embedUrl} className="w-full h-full" allowFullScreen loading="lazy" />
                </div>
            )
        }
    }

    // DOCUMENT
    if (resource.type === 'DOCUMENT' && resource.url) {
        const drivePreview = getGoogleDrivePreview(resource.url)
        return (
            <div className="aspect-4/5 rounded-2xl overflow-hidden mb-4 border border-stone-200 bg-stone-50">
                <iframe src={drivePreview || resource.url} className="w-full h-full" loading="lazy" allow="autoplay" />
            </div>
        )
    }

    // NOTE
    if (resource.type === 'NOTE') {
        const drivePreview = resource.url ? getGoogleDrivePreview(resource.url) : null
        if (drivePreview) {
            return (
                <div className="aspect-4/5 rounded-2xl overflow-hidden mb-4 border border-amber-200 bg-amber-50/50">
                    <iframe src={drivePreview} className="w-full h-full" loading="lazy" allow="autoplay" />
                </div>
            )
        }
    }

    // LINK
    if (resource.type === 'LINK' && resource.url) {
        let hostname = ''
        try { hostname = new URL(resource.url).hostname } catch { }
        const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
        const isEmbeddable =
            resource.url.includes('figma.com') ||
            resource.url.includes('canva.com') ||
            resource.url.includes('docs.google.com')

        return (
            <div className="mb-4">
                {isEmbeddable ? (
                    <div className="aspect-video rounded-2xl overflow-hidden border border-stone-200 mb-3">
                        <iframe src={resource.url} className="w-full h-full" loading="lazy" />
                    </div>
                ) : (
                    <a href={resource.url} target="_blank" className="block">
                        <div className="rounded-2xl border border-stone-200 overflow-hidden bg-stone-50 hover:border-violet-200 transition-colors">
                            <div className="aspect-video bg-linear-to-br from-violet-50 to-blue-50 flex items-center justify-center">
                                <Image src={favicon} alt={hostname} width={80} height={80} className="w-16 h-16 rounded-2xl shadow-sm" />
                            </div>
                            <div className="p-3.5">
                                <p className="font-bold text-stone-700 line-clamp-1 text-sm">{hostname}</p>
                                <p className="text-xs text-stone-400 truncate mt-0.5">{resource.url}</p>
                            </div>
                        </div>
                    </a>
                )}
            </div>
        )
    }

    return null
}

export default function ResourceClient({
    subjects,
    resources,
}: {
    subjects: Subject[]
    resources: Resource[]
}) {
    const [filterSubject, setFilterSubject] = useState<string>('all')
    const [filterType, setFilterType] = useState<string>('all')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalVisible, setModalVisible] = useState(false)
    const [form, setForm] = useState({ subjectId: '', title: '', type: '', url: '', content: '' })
    const [errors, setErrors] = useState({ subjectId: false, title: false, type: false })
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

    const openModal = () => {
        setIsModalOpen(true)
        requestAnimationFrame(() => setModalVisible(true))
    }
    const closeModal = () => {
        setModalVisible(false)
        setTimeout(() => setIsModalOpen(false), 300)
    }

    const validateForm = () => {
        const newErrors = {
            subjectId: !form.subjectId,
            title: !form.title.trim(),
            type: !form.type,
        }
        setErrors(newErrors)
        return !Object.values(newErrors).some(Boolean)
    }

    const isFormValid = form.subjectId && form.title.trim() && form.type

    const filteredResources = resources.filter((res) => {
        const matchSubject = filterSubject === 'all' || res.subject.id.toString() === filterSubject
        const matchType = filterType === 'all' || res.type === filterType
        return matchSubject && matchType
    })

    const handleDelete = async (id: number) => {
        await deleteResource(id)
        setConfirmDeleteId(null)
    }

    return (
        <section className="space-y-5">
            {/* Filter bar */}
            <div className="rounded-3xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-stone-100 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        {[
                            {
                                label: 'รายวิชา',
                                value: filterSubject,
                                onChange: setFilterSubject,
                                options: [
                                    <option key="all" value="all">📚 ทุกรายวิชา</option>,
                                    ...subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                                ]
                            },
                            {
                                label: 'ประเภท',
                                value: filterType,
                                onChange: setFilterType,
                                options: [
                                    <option key="all" value="all">🗂️ ทุกประเภท</option>,
                                    <option key="VIDEO" value="VIDEO">🎬 วิดีโอ</option>,
                                    <option key="DOCUMENT" value="DOCUMENT">📄 เอกสาร</option>,
                                    <option key="LINK" value="LINK">🔗 ลิงก์ภายนอก</option>,
                                    <option key="NOTE" value="NOTE">📝 โน้ตสรุป</option>,
                                ]
                            }
                        ].map(({ label, value, onChange, options }) => (
                            <div key={label} className="relative flex-1 min-w-0">
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5 block">{label}</label>
                                <div className="relative">
                                    <select
                                        value={value}
                                        onChange={e => onChange(e.target.value)}
                                        className="cursor-pointer w-full bg-stone-50 text-stone-700 border border-stone-200 hover:border-stone-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 rounded-2xl px-4 py-2.5 text-sm outline-none transition-all appearance-none font-medium"
                                    >
                                        {options}
                                    </select>
                                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs">▾</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={openModal}
                        className="cursor-pointer w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white px-5 py-2.5 rounded-2xl font-black text-sm transition-all shadow-[0_4px_16px_rgba(5,150,105,0.3)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.4)]"
                    >
                        + เพิ่มแหล่งใหม่
                    </button>
                </div>

                {/* Count badge */}
                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
                    <span className="text-xs text-stone-400 font-medium">
                        แสดง <span className="font-black text-stone-700">{filteredResources.length}</span> รายการ
                    </span>
                </div>
            </div>

            {/* Resources Grid */}
            {filteredResources.length === 0 ? (
                <div className="rounded-3xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-stone-100 py-16 text-center">
                    <div className="text-5xl mb-3">🗂️</div>
                    <p className="text-sm font-bold text-stone-400">ไม่พบรายการ</p>
                    <p className="text-xs text-stone-300 mt-1">ลองเปลี่ยนตัวกรอง หรือเพิ่มแหล่งใหม่</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResources.map((res) => {
                        const meta = TYPE_META[res.type] ?? { icon: '•', label: res.type, bg: 'bg-stone-50', text: 'text-stone-500', border: 'border-stone-200' }
                        const isConfirming = confirmDeleteId === res.id

                        return (
                            <div
                                key={res.id}
                                className="group bg-white border border-stone-100 p-5 rounded-3xl hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:border-stone-200 transition-all duration-300"
                            >
                                <ResourcePreview resource={res} />

                                {/* Subject + delete */}
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-black border ${meta.bg} ${meta.text} ${meta.border}`}>
                                        {res.subject.name}
                                    </span>

                                    {isConfirming ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleDelete(res.id)}
                                                className="cursor-pointer px-2 py-1 rounded-lg bg-rose-50 text-rose-500 border border-rose-200 text-[10px] font-bold hover:bg-rose-100 transition-colors"
                                            >
                                                ลบ
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="cursor-pointer px-2 py-1 rounded-lg bg-stone-100 text-stone-500 text-[10px] font-bold hover:bg-stone-200 transition-colors"
                                            >
                                                ยกเลิก
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteId(res.id)}
                                            className="cursor-pointer w-7 h-7 rounded-xl bg-stone-100 border border-stone-200 text-stone-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                <h3 className="text-base font-black text-stone-800 mb-2 line-clamp-1">{res.title}</h3>

                                {res.content && (
                                    <p className="text-sm text-stone-400 mb-4 line-clamp-2 leading-relaxed">{res.content}</p>
                                )}

                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-stone-100">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}>
                                            {meta.icon} {meta.label}
                                        </span>
                                    </div>

                                    {res.url && (
                                        <a
                                            href={res.url}
                                            target="_blank"
                                            className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors flex items-center gap-1"
                                        >
                                            เปิด
                                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                <polyline points="15 3 21 3 21 9" />
                                                <line x1="10" y1="14" x2="21" y2="3" />
                                            </svg>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Add Modal */}
            {isModalOpen && (
                <div
                    onClick={closeModal}
                    className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm transition-all duration-300 ${
                        modalVisible ? 'bg-black/20 opacity-100' : 'bg-black/0 opacity-0'
                    }`}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className={`w-full max-w-md rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 ${
                            modalVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
                        }`}
                    >
                        {/* Accent strip */}
                        <div className="h-1.5 w-full bg-linear-to-r from-emerald-400 via-teal-400 to-blue-400" />

                        {/* Header */}
                        <div className="px-6 pt-5 pb-4 border-b border-stone-100 flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-base">🗂️</div>
                                    <h2 className="text-lg font-black text-stone-800">เพิ่มเข้าคลังแสง</h2>
                                </div>
                                <p className="text-sm text-stone-400 mt-2 ml-10.5">เพิ่มสื่อการเรียน เอกสาร หรือโน้ตสรุปใหม่</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="cursor-pointer shrink-0 w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            action={async (formData) => {
                                if (!validateForm()) return
                                await addResource(formData)
                                setForm({ subjectId: '', title: '', type: '', url: '', content: '' })
                                setErrors({ subjectId: false, title: false, type: false })
                                closeModal()
                            }}
                        >
                            {/* Body */}
                            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                                {/* รายวิชา */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">รายวิชา</label>
                                    <div className="relative">
                                        <select
                                            name="subjectId"
                                            value={form.subjectId}
                                            onChange={e => {
                                                setForm({ ...form, subjectId: e.target.value })
                                                if (e.target.value) setErrors({ ...errors, subjectId: false })
                                            }}
                                            className={`cursor-pointer w-full bg-stone-50 text-stone-800 border rounded-2xl px-4 py-3 text-sm outline-none transition-all appearance-none font-medium ${
                                                errors.subjectId ? 'border-rose-300 bg-rose-50/50' : 'border-stone-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100'
                                            }`}
                                        >
                                            <option disabled value="">-- เลือกรายวิชา --</option>
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs">▾</span>
                                    </div>
                                    {errors.subjectId && <p className="text-rose-500 text-xs mt-1.5 font-medium">กรุณาเลือกรายวิชา</p>}
                                </div>

                                {/* หัวข้อ */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">หัวข้อ / ชื่อไฟล์</label>
                                    <input
                                        name="title"
                                        value={form.title}
                                        onChange={e => {
                                            setForm({ ...form, title: e.target.value })
                                            if (e.target.value.trim()) setErrors({ ...errors, title: false })
                                        }}
                                        className={`w-full bg-stone-50 text-stone-800 border rounded-2xl px-4 py-3 text-sm outline-none transition-all placeholder:text-stone-300 ${
                                            errors.title ? 'border-rose-300 bg-rose-50/50' : 'border-stone-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100'
                                        }`}
                                        placeholder="เช่น สรุปฟิสิกส์นิวเคลียร์"
                                    />
                                    {errors.title && <p className="text-rose-500 text-xs mt-1.5 font-medium">กรุณากรอกหัวข้อ</p>}
                                </div>

                                {/* ประเภท + URL */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">ประเภท</label>
                                        <div className="relative">
                                            <select
                                                name="type"
                                                value={form.type}
                                                onChange={e => {
                                                    setForm({ ...form, type: e.target.value })
                                                    if (e.target.value) setErrors({ ...errors, type: false })
                                                }}
                                                className={`cursor-pointer w-full bg-stone-50 text-stone-800 border rounded-2xl px-4 py-3 text-sm outline-none transition-all appearance-none font-medium ${
                                                    errors.type ? 'border-rose-300 bg-rose-50/50' : 'border-stone-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100'
                                                }`}
                                            >
                                                <option value="">-- เลือก --</option>
                                                <option value="VIDEO">🎬 วิดีโอ</option>
                                                <option value="DOCUMENT">📄 เอกสาร</option>
                                                <option value="NOTE">📝 โน้ตสรุป</option>
                                                <option value="LINK">🔗 ลิงก์</option>
                                            </select>
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">▾</span>
                                        </div>
                                        {errors.type && <p className="text-rose-500 text-xs mt-1.5 font-medium">กรุณาเลือกประเภท</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">URL (ถ้ามี)</label>
                                        <input
                                            name="url"
                                            defaultValue={form.url}
                                            className="w-full bg-stone-50 text-stone-800 border border-stone-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all placeholder:text-stone-300"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                {/* รายละเอียด */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">รายละเอียด / เนื้อหา</label>
                                    <textarea
                                        name="content"
                                        rows={3}
                                        defaultValue={form.content}
                                        className="w-full bg-stone-50 text-stone-800 border border-stone-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all resize-none placeholder:text-stone-300"
                                        placeholder="จดโน้ตย่อตรงนี้..."
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="grid grid-cols-2 gap-3 px-6 pb-6 pt-1">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="cursor-pointer h-12 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-sm font-bold text-stone-500 transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isFormValid}
                                    className={`h-12 rounded-2xl text-sm font-black transition-all ${
                                        isFormValid
                                            ? 'cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_4px_16px_rgba(5,150,105,0.3)]'
                                            : 'cursor-not-allowed bg-stone-100 text-stone-300'
                                    }`}
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    )
}