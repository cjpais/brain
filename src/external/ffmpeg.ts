import ffmpeg from "fluent-ffmpeg";

export const getMediaFileInfo = async (filePath: string) => {
  const metadata = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        console.error("Error reading file metadata:", err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  if (!metadata.format) throw new Error("No format found");
  if (!metadata.format.duration) throw new Error("No duration found");

  return metadata;
};

export function processChunk(
  fileName: string,
  startTime: number,
  duration: number,
  outputFileName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(fileName)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputFileName)
      .on("end", () => {
        console.log(`Processed chunk: ${outputFileName}`);
        resolve();
      })
      .on("error", (err) => {
        console.error(`Error processing chunk: ${outputFileName}`, err);
        reject(err);
      })
      .run();
  });
}

export const cleanAudio = async (
  input: string,
  output: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .audioFilter(
        "silenceremove=start_periods=1:stop_periods=-1:stop_duration=5:start_threshold=-45dB:stop_threshold=-45dB"
      )
      .audioFilter("highpass=f=100")
      .audioFilter("lowpass=f=15000")
      .audioFilter("acompressor")
      .audioFilter("loudnorm=I=-16:TP=-1.5:LRA=11")

      // Event: on process completion
      .on("end", () => {
        console.log(`Audio cleaned and saved to ${output}`);
        resolve();
      })

      // Event: on error
      .on("error", (err) => {
        console.error(`An error occurred: ${err.message}`);
        reject(err);
      })

      // Output the processed file
      .save(output);
  });
};
