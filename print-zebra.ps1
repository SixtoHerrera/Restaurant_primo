$ErrorActionPreference = 'Stop'
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class PrimoSpool {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO {public string pDocName; public string pOutputFile; public string pDatatype;}
 [DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool OpenPrinter(string name,out IntPtr h,IntPtr defaults);
 [DllImport("winspool.drv",CharSet=CharSet.Unicode,SetLastError=true)] static extern int StartDocPrinter(IntPtr h,int level,[In] DOCINFO info);
 [DllImport("winspool.drv",SetLastError=true)] static extern bool StartPagePrinter(IntPtr h);
 [DllImport("winspool.drv",SetLastError=true)] static extern bool WritePrinter(IntPtr h,byte[] bytes,int count,out int written);
 [DllImport("winspool.drv",SetLastError=true)] static extern bool EndPagePrinter(IntPtr h);
 [DllImport("winspool.drv",SetLastError=true)] static extern bool EndDocPrinter(IntPtr h);
 [DllImport("winspool.drv")] static extern bool AbortPrinter(IntPtr h);
 [DllImport("winspool.drv")] static extern bool ClosePrinter(IntPtr h);
 static void Check(bool ok){if(!ok)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());}
 public static int Send(string name,byte[] bytes){IntPtr h;Check(OpenPrinter(name,out h,IntPtr.Zero));bool started=false;try{int id=StartDocPrinter(h,1,new DOCINFO {pDocName="El Primo - orden",pDatatype="RAW"});Check(id!=0);started=true;Check(StartPagePrinter(h));int written;Check(WritePrinter(h,bytes,bytes.Length,out written));if(written!=bytes.Length)throw new Exception("Envio incompleto");Check(EndPagePrinter(h));Check(EndDocPrinter(h));started=false;return id;}finally{if(started)AbortPrinter(h);ClosePrinter(h);}}
}
"@
$id = [PrimoSpool]::Send([string]$request.printer,[Convert]::FromBase64String($request.data))
@{jobId=$id} | ConvertTo-Json -Compress
