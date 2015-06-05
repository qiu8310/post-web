module Compass::SassExtensions::Functions::Files
  def exist(file)
    path = file.value
    # Compute the real path to the image on the file system if the images_dir is set.
    if Compass.configuration.images_path
      path = File.join(Compass.configuration.images_path, path)
    else
      path = File.join(Compass.configuration.project_path, path)
    end

    # Sass::Script::String.new(path)
    Sass::Script::Bool.new(File.exist?(path))
  end
end


module Sass::Script::Functions

  include Compass::SassExtensions::Functions::Files

  def reverse(string)
    assert_type string, :String
    Sass::Script::String.new(string.value.reverse)
  end
  declare :reverse, [:string]

end
