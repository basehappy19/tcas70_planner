'use client'

import { useState } from 'react'
import { addResource, deleteResource } from '../actions/resource'
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
    const regExp =
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)

    return match && match[2].length === 11
        ? `https://www.youtube.com/embed/${match[2]}`
        : null
}

function getGoogleDrivePreview(url: string) {
    const match = url.match(/\/d\/(.*?)\//)

    if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`
    }

    return null
}

function ResourcePreview({ resource }: { resource: Resource }) {
    // VIDEO
    if (resource.type === 'VIDEO' && resource.url) {
        const embedUrl = getYoutubeEmbed(resource.url)

        if (embedUrl) {
            return (
                <div className="aspect-video rounded-xl overflow-hidden mb-4 border border-white/10">
                    <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        loading="lazy"
                    />
                </div>
            )
        }
    }

    // DOCUMENT
    if (resource.type === 'DOCUMENT' && resource.url) {
        const drivePreview = getGoogleDrivePreview(resource.url)

        return (
            <div className="aspect-4/5 rounded-xl overflow-hidden mb-4 border border-white/10 bg-[#0a0a0a]">
                <iframe
                    src={drivePreview || resource.url}
                    className="w-full h-full"
                    loading="lazy"
                    allow="autoplay"
                />
            </div>
        )
    }

    // NOTE
    if (resource.type === 'NOTE') {
        const drivePreview = resource.url
            ? getGoogleDrivePreview(resource.url)
            : null

        if (drivePreview) {
            return (
                <div className="aspect-4/5 rounded-xl overflow-hidden mb-4 border border-yellow-500/20 bg-[#0a0a0a]">
                    <iframe
                        src={drivePreview}
                        className="w-full h-full"
                        loading="lazy"
                        allow="autoplay"
                    />
                </div>
            )
        }
    }

    // LINK
    if (resource.type === 'LINK' && resource.url) {
        let hostname = ''

        try {
            hostname = new URL(resource.url).hostname
        } catch { }

        const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`

        const isEmbeddable =
            resource.url.includes('figma.com') ||
            resource.url.includes('canva.com') ||
            resource.url.includes('docs.google.com')

        return (
            <div className="mb-4">
                {/* iframe preview */}
                {isEmbeddable ? (
                    <div className="aspect-video rounded-xl overflow-hidden border border-white/10 mb-3">
                        <iframe
                            src={resource.url}
                            className="w-full h-full"
                            loading="lazy"
                        />
                    </div>
                ) : (
                    <a
                        href={resource.url}
                        target="_blank"
                        className="block"
                    >
                        <div className="rounded-xl border border-white/10 overflow-hidden bg-[#1a1a1a]">
                            <div className="aspect-video bg-linear-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                                <Image
                                    src={favicon}
                                    alt={hostname}
                                    width={80}
                                    height={80}
                                    className="w-20 h-20 rounded-2xl"
                                />
                            </div>

                            <div className="p-4">
                                <p className="font-semibold line-clamp-1">
                                    {hostname}
                                </p>

                                <p className="text-sm text-neutral-400 truncate">
                                    {resource.url}
                                </p>
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

    const openModal = () => {
        setIsModalOpen(true)

        requestAnimationFrame(() => {
            setModalVisible(true)
        })
    }

    const closeModal = () => {
        setModalVisible(false)

        setTimeout(() => {
            setIsModalOpen(false)
        }, 300)
    }
    const [form, setForm] = useState({
        subjectId: '',
        title: '',
        type: '',
        url: '',
        content: '',
    })

    const [errors, setErrors] = useState({
        subjectId: false,
        title: false,
        type: false,
    })

    const validateForm = () => {
        const newErrors = {
            subjectId: !form.subjectId,
            title: !form.title.trim(),
            type: !form.type,
        }

        setErrors(newErrors)

        return !Object.values(newErrors).some(Boolean)
    }

    const isFormValid =
        form.subjectId &&
        form.title.trim() &&
        form.type

    const filteredResources = resources.filter((res) => {
        const matchSubject =
            filterSubject === 'all' ||
            res.subject.id.toString() === filterSubject

        const matchType =
            filterType === 'all' || res.type === filterType

        return matchSubject && matchType
    })

    const handleDelete = async (id: number) => {
        if (confirm('ยืนยันการลบข้อมูลนี้?')) {
            await deleteResource(id)
        }
    }

    return (
        <section className="space-y-6">
            <div className="bg-[#111] border border-white/5 rounded-3xl p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 min-w-0">
                            <label className="text-[11px] uppercase tracking-wider text-neutral-500 font-bold mb-1.5 block">
                                รายวิชา
                            </label>

                            <select
                                value={filterSubject}
                                onChange={(e) =>
                                    setFilterSubject(e.target.value)
                                }
                                className="cursor-pointer w-full bg-[#1a1a1a] border border-white/10 hover:border-white/20 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm outline-none transition-colors appearance-none"
                            >
                                <option value="all">📚 ทุกรายวิชา</option>

                                {subjects.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>

                            <div className="pointer-events-none absolute right-4 top-[38px] text-neutral-500">
                                ▼
                            </div>
                        </div>

                        <div className="relative flex-1 min-w-0">
                            <label className="text-[11px] uppercase tracking-wider text-neutral-500 font-bold mb-1.5 block">
                                ประเภท
                            </label>

                            <select
                                value={filterType}
                                onChange={(e) =>
                                    setFilterType(e.target.value)
                                }
                                className="cursor-pointer w-full bg-[#1a1a1a] border border-white/10 hover:border-white/20 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm outline-none transition-colors appearance-none"
                            >
                                <option value="all">
                                    🗂️ ทุกประเภท
                                </option>

                                <option value="VIDEO">
                                    🎬 วิดีโอ
                                </option>

                                <option value="DOCUMENT">
                                    📄 เอกสาร
                                </option>

                                <option value="LINK">
                                    🔗 ลิงก์ภายนอก
                                </option>

                                <option value="NOTE">
                                    📝 โน้ตสรุป
                                </option>
                            </select>

                            <div className="pointer-events-none absolute right-4 top-[38px] text-neutral-500">
                                ▼
                            </div>
                        </div>
                    </div>

                    {/* Action */}
                    <div className="flex items-end">
                        <button
                            onClick={openModal}
                            className="cursor-pointer w-full sm:w-auto bg-white text-black px-5 py-3 rounded-2xl font-bold text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-lg shadow-white/5"
                        >
                            + เพิ่มแหล่งใหม่
                        </button>
                    </div>
                </div>
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResources.map((res) => (
                    <div
                        key={res.id}
                        className="group bg-[#111] border border-white/5 p-5 rounded-2xl hover:border-blue-500/50 transition-all duration-300"
                    >
                        <ResourcePreview resource={res} />

                        <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] uppercase tracking-widest bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md font-bold">
                                {res.subject.name}
                            </span>

                            <button
                                onClick={() =>
                                    handleDelete(res.id)
                                }
                                className="cursor-pointer text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                            </button>
                        </div>

                        <h3 className="text-lg font-semibold mb-2 line-clamp-1">
                            {res.title}
                        </h3>

                        {res.content && (
                            <p className="text-sm text-neutral-400 mb-4 line-clamp-2">
                                {res.content}
                            </p>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                {res.type === 'VIDEO' && (
                                    <span className="text-xl">🎬</span>
                                )}

                                {res.type === 'DOCUMENT' && (
                                    <span className="text-xl">📄</span>
                                )}

                                {res.type === 'LINK' && (
                                    <span className="text-xl">🔗</span>
                                )}

                                {res.type === 'NOTE' && (
                                    <span className="text-xl">📝</span>
                                )}

                                {res.type === 'VIDEO' ? (
                                    <span className="text-xl">
                                        วิดีโอ
                                    </span>
                                ) : res.type === 'DOCUMENT' ? (
                                    <span className="text-xl">
                                        เอกสาร
                                    </span>
                                ) : res.type === 'LINK' ? (
                                    <span className="text-xl">
                                        ลิงก์ภายนอก
                                    </span>
                                ) : res.type === 'NOTE' ? (
                                    <span className="text-xl">
                                        โน๊ตสรุป
                                    </span>
                                ) : (
                                    <span className="text-xl">
                                        {res.type}
                                    </span>
                                )}
                            </div>

                            {res.url && (
                                <a
                                    href={res.url}
                                    target="_blank"
                                    className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    เปิด

                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line
                                            x1="10"
                                            y1="14"
                                            x2="21"
                                            y2="3"
                                        />
                                    </svg>
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div
                    onClick={closeModal}
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300 ${modalVisible
                        ? "bg-black/60 opacity-100"
                        : "bg-black/0 opacity-0"
                        }`}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-[#111]/95 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${modalVisible
                            ? "scale-100 translate-y-0 opacity-100"
                            : "scale-95 translate-y-4 opacity-0"
                            }`}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/5 flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    เพิ่มเข้าคลังแสง 🗂️
                                </h2>

                                <p className="text-sm text-neutral-500 mt-1">
                                    เพิ่มสื่อการเรียน เอกสาร หรือโน้ตสรุปใหม่
                                </p>
                            </div>

                            <button
                                onClick={closeModal}
                                className="cursor-pointer text-neutral-600 hover:text-white transition-colors p-1"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M18 6L6 18" />
                                    <path d="M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form
                            action={async (formData) => {
                                if (!validateForm()) return

                                await addResource(formData)

                                setForm({
                                    subjectId: '',
                                    title: '',
                                    type: '',
                                    url: '',
                                    content: '',
                                })

                                setErrors({
                                    subjectId: false,
                                    title: false,
                                    type: false,
                                })

                                closeModal()
                            }}
                            className="flex flex-col"
                        >
                            {/* Body */}
                            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                                <div>
                                    <label className="block text-[11px] text-neutral-500 mb-2 uppercase tracking-wider font-bold">
                                        รายวิชา
                                    </label>

                                    <select
                                        name="subjectId"
                                        value={form.subjectId}
                                        onChange={(e) => {
                                            setForm({
                                                ...form,
                                                subjectId: e.target.value,
                                            })

                                            if (e.target.value) {
                                                setErrors({
                                                    ...errors,
                                                    subjectId: false,
                                                })
                                            }
                                        }}
                                        className={`cursor-pointer w-full bg-[#1a1a1a] border rounded-2xl px-4 py-3 text-sm outline-none transition-colors ${errors.subjectId
                                            ? 'border-red-500'
                                            : 'border-white/10 focus:border-blue-500'
                                            }`}
                                    >
                                        <option disabled value="">
                                            -- เลือกรายวิชา --
                                        </option>

                                        {subjects.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>

                                    {errors.subjectId && (
                                        <p className="text-red-500 text-xs mt-1.5">
                                            กรุณาเลือกรายวิชา
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[11px] text-neutral-500 mb-2 uppercase tracking-wider font-bold">
                                        หัวข้อ / ชื่อไฟล์
                                    </label>

                                    <input
                                        name="title"
                                        value={form.title}
                                        onChange={(e) => {
                                            setForm({
                                                ...form,
                                                title: e.target.value,
                                            })

                                            if (e.target.value.trim()) {
                                                setErrors({
                                                    ...errors,
                                                    title: false,
                                                })
                                            }
                                        }}
                                        className={`w-full bg-[#1a1a1a] border rounded-2xl px-4 py-3 text-sm outline-none transition-colors ${errors.title
                                            ? 'border-red-500'
                                            : 'border-white/10 focus:border-blue-500'
                                            }`}
                                        placeholder="เช่น สรุปฟิสิกส์นิวเคลียร์"
                                    />

                                    {errors.title && (
                                        <p className="text-red-500 text-xs mt-1.5">
                                            กรุณากรอกหัวข้อ
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] text-neutral-500 mb-2 uppercase tracking-wider font-bold">
                                            ประเภท
                                        </label>

                                        <select
                                            name="type"
                                            value={form.type}
                                            onChange={(e) => {
                                                setForm({
                                                    ...form,
                                                    type: e.target.value,
                                                })

                                                if (e.target.value) {
                                                    setErrors({
                                                        ...errors,
                                                        type: false,
                                                    })
                                                }
                                            }}
                                            className={`cursor-pointer w-full bg-[#1a1a1a] border rounded-2xl px-4 py-3 text-sm outline-none transition-colors ${errors.type
                                                ? 'border-red-500'
                                                : 'border-white/10 focus:border-blue-500'
                                                }`}
                                        >
                                            <option value="">-- เลือกประเภท --</option>

                                            <option value="VIDEO">
                                                🎬 วิดีโอ
                                            </option>

                                            <option value="DOCUMENT">
                                                📄 เอกสาร
                                            </option>

                                            <option value="NOTE">
                                                📝 โน๊ตสรุป
                                            </option>

                                            <option value="LINK">
                                                🔗 ลิงก์ภายนอก
                                            </option>
                                        </select>

                                        {errors.type && (
                                            <p className="text-red-500 text-xs mt-1.5">
                                                กรุณาเลือกประเภท
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] text-neutral-500 mb-2 uppercase tracking-wider font-bold">
                                            URL (ถ้ามี)
                                        </label>

                                        <input
                                            name="url"
                                            defaultValue={form.url}
                                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] text-neutral-500 mb-2 uppercase tracking-wider font-bold">
                                        รายละเอียด / เนื้อหา
                                    </label>

                                    <textarea
                                        name="content"
                                        rows={4}
                                        defaultValue={form.content}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                                        placeholder="จดโน้ตย่อตรงนี้..."
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-white/5 px-6 py-5 flex gap-3 bg-white/2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="cursor-pointer flex-1 px-4 py-3 rounded-2xl border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    ยกเลิก
                                </button>

                                <button
                                    type="submit"
                                    disabled={!isFormValid}
                                    className={`flex-1 px-4 py-3 rounded-2xl font-bold transition-all ${isFormValid
                                        ? 'cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white'
                                        : 'cursor-not-allowed bg-neutral-800 text-neutral-500'
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