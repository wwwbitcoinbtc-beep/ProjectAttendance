import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Member, AttendanceRecord } from '../types';
import * as db from '../services/db';
import { formatToShamsi, parseShamsi } from '../utils/date-formatter';
import { toPersianDigits } from '../utils/persian-utils';
import Spinner, { ButtonSpinner } from './DataManagement';

// Make TypeScript aware of global libs from CDN
declare const jspdf: any;
declare const html2canvas: any;

interface ReportData {
  present: number;
  absent: number;
  total: number;
  details: { date: string; status: 'حاضر' | 'غایب' }[];
}

const GLOBAL_START_DATE_SHAMSI = '1404-07-27';

const getInsuranceStatus = (member: Member): { text: string; colorClass: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    if (member.insuranceStartDate && member.insuranceEndDate) {
        const startDate = new Date(member.insuranceStartDate);
        const endDate = new Date(member.insuranceEndDate);
        if (today >= startDate && today <= endDate) {
            return { text: 'دارد', colorClass: 'text-green-600' };
        }
    }
    
    return { text: 'ندارد', colorClass: 'text-red-600' };
};


const Reporting: React.FC<{ members: Member[] }> = ({ members }) => {
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const reportContentRef = useRef<HTMLDivElement>(null);

    const filteredMembers = useMemo(() => {
        if (!searchQuery) return members;
        return members.filter(member =>
            `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [members, searchQuery]);

    useEffect(() => {
        const fetchReport = async () => {
            if (!selectedMember) {
                setReportData(null);
                return;
            }

            setLoadingReport(true);
            try {
                const records = await db.getAllAttendanceForMember(selectedMember.id);

                if (records.length === 0) {
                    setReportData({ present: 0, absent: 0, total: 0, details: [] });
                    return;
                }

                // Sort records to safely get the last attendance date
                records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                const calculationStartDate = parseShamsi(GLOBAL_START_DATE_SHAMSI);
                if (!calculationStartDate) {
                    throw new Error("Invalid global start date.");
                }

                const lastAttendanceDate = new Date(records[records.length - 1].date);
                
                const presentDates = new Set(records.map(record => record.date));
                const details: ReportData['details'] = [];
                let totalPracticeDays = 0;
                
                // Practice days are Sunday, Tuesday, Thursday
                const practiceDayIndices = [0, 2, 4]; 

                // Iterate from the global start date to the last recorded attendance
                let currentDate = new Date(calculationStartDate);
                currentDate.setHours(0,0,0,0); // Normalize time
                lastAttendanceDate.setHours(0,0,0,0);

                while (currentDate <= lastAttendanceDate) {
                    // Check if the current day is a practice day
                    if (practiceDayIndices.includes(currentDate.getDay())) {
                        totalPracticeDays++;
                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                        
                        if (presentDates.has(dateStr)) {
                            details.push({
                                date: formatToShamsi(currentDate),
                                status: 'حاضر',
                            });
                        } else {
                            details.push({
                                date: formatToShamsi(currentDate),
                                status: 'غایب',
                            });
                        }
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                // Sort details by date descending (most recent first) for better UX
                details.sort((a, b) => (parseShamsi(b.date)?.getTime() ?? 0) - (parseShamsi(a.date)?.getTime() ?? 0));

                const presentCount = records.length;
                const absentCount = totalPracticeDays - presentCount;

                setReportData({
                    present: presentCount,
                    absent: absentCount < 0 ? 0 : absentCount, // Ensure not negative
                    total: totalPracticeDays,
                    details: details
                });

            } catch (e) {
                console.error("Failed to fetch report data", e);
                alert("خطا در دریافت اطلاعات گزارش.");
            } finally {
                setLoadingReport(false);
            }
        };

        fetchReport();
    }, [selectedMember]);


    const handleDownloadPdf = async () => {
        if (!reportContentRef.current || !selectedMember) return;
        setIsGeneratingPdf(true);
        try {
            const { jsPDF } = jspdf;
            const canvas = await html2canvas(reportContentRef.current, {
                scale: 2, // Higher resolution for better quality
                useCORS: true,
                backgroundColor: '#ffffff', // Explicitly set background
            });
            
            const imgData = canvas.toDataURL('image/png');
            
            // Create a standard A4 PDF in portrait mode (points as units)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasAspectRatio = canvas.width / canvas.height;
            
            // Calculate image dimensions to fit within A4 page with margins
            let imgWidth = pdfWidth - 40; // 20pt margin on each side
            let imgHeight = imgWidth / canvasAspectRatio;

            // If the image is too tall, scale it down to fit the page height
            if (imgHeight > pdfHeight - 40) {
                imgHeight = pdfHeight - 40; // 20pt margin top/bottom
                imgWidth = imgHeight * canvasAspectRatio;
            }

            // Center the image on the page
            const xOffset = (pdfWidth - imgWidth) / 2;
            const yOffset = 20; // 20pt top margin

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
            
            const fileName = `Report-${selectedMember.firstName}-${selectedMember.lastName}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("خطا در ایجاد فایل PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    if (members.length === 0) {
      return (
        <div className="text-center p-8 text-gray-500" dir="rtl">
          <h2 className="text-xl font-semibold mb-2">لیست اعضا خالی است</h2>
          <p>برای گزارش‌گیری، ابتدا از بخش "مدیریت اعضا" یک عضو اضافه کنید.</p>
        </div>
      );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" dir="rtl">
            {/* Member List Column */}
            <div className="md:col-span-1 bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4">انتخاب عضو</h3>
                <input
                    type="text"
                    placeholder="جستجوی نام عضو..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <ul className="max-h-[60vh] overflow-y-auto border rounded-md">
                    {filteredMembers.map(member => (
                        <li key={member.id}>
                            <button
                                onClick={() => setSelectedMember(member)}
                                className={`w-full text-right px-4 py-3 text-sm font-medium border-b last:border-b-0 transition-colors ${selectedMember?.id === member.id ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                {member.firstName} {member.lastName}
                            </button>
                        </li>
                    ))}
                     {filteredMembers.length === 0 && <li className="p-4 text-center text-gray-500">عضوی یافت نشد.</li>}
                </ul>
            </div>

            {/* Report View Column */}
            <div className="md:col-span-2 bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4">نمایش گزارش کامل</h3>
                
                <div className="border-t pt-4">
                    {!selectedMember ? (
                        <div className="text-center py-10 text-gray-500">
                            <p>یک عضو را برای مشاهده گزارش انتخاب کنید.</p>
                        </div>
                    ) : loadingReport ? (
                        <div className="flex justify-center py-10"><Spinner /></div>
                    ) : !reportData ? (
                         <div className="text-center py-10 text-gray-500">
                            <p>گزارشی برای نمایش وجود ندارد.</p>
                        </div>
                    ) : (
                        <>
                            <div ref={reportContentRef} className="p-4 bg-white rounded-lg">
                                <h4 className="text-xl font-bold text-center mb-2">{selectedMember.firstName} {selectedMember.lastName}</h4>
                                <p className={`text-center text-md font-semibold mb-4 ${getInsuranceStatus(selectedMember).colorClass}`}>
                                    وضعیت بیمه: {getInsuranceStatus(selectedMember).text}
                                </p>
                                <p className="text-center text-sm text-gray-600 mb-4">گزارش حضور و غیاب از تاریخ {toPersianDigits(GLOBAL_START_DATE_SHAMSI)}</p>

                                <div className="grid grid-cols-2 gap-4 my-6 text-center">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <p className="font-bold text-green-800 text-lg">{toPersianDigits(reportData.present)}</p>
                                        <p className="text-sm text-green-700">تعداد حضور</p>
                                    </div>
                                    <div className="p-3 bg-red-100 rounded-lg">
                                        <p className="font-bold text-red-800 text-lg">{toPersianDigits(reportData.absent)}</p>
                                        <p className="text-sm text-red-700">تعداد غیبت</p>
                                    </div>
                                </div>
                                
                                {reportData.details.length > 0 ? (
                                  <div className="max-h-80 overflow-y-auto mt-4 border rounded-md">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-200 sticky top-0">
                                            <tr>
                                                <th className="p-2 text-right">تاریخ</th>
                                                <th className="p-2 text-right">وضعیت</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.details.map((item, index) => (
                                                <tr key={`${item.date}-${index}`} className="border-b last:border-b-0">
                                                    <td className="p-2">{toPersianDigits(item.date)}</td>
                                                    <td className={`p-2 font-semibold ${item.status === 'حاضر' ? 'text-green-600' : 'text-red-600'}`}>{item.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                  </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-500">
                                        <p>هیچ رکورد حضوری برای این عضو ثبت نشده است.</p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={isGeneratingPdf || reportData.details.length === 0}
                                    className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-300 min-w-[120px] flex justify-center items-center"
                                >
                                    {isGeneratingPdf ? <ButtonSpinner /> : 'دانلود PDF'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reporting;