module Sass::Script::Functions
  def reverse(string)
    assert_type string, :String
    Sass::Script::String.new(string.value.reverse)
  end
  declare :reverse, [:string]
end